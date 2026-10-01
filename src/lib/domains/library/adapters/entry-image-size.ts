import type { FileEntry } from '@zip.js/zip.js';
import { readImageHeader } from '$lib/platform/image/image-header';
import type { HeaderReading } from '$lib/platform/image/image-header';
import type { Size } from '$lib/shared/geometry';
import type { SizesRead } from '$lib/shared/page-source';

type HeaderRead = { reading: HeaderReading; bytes: Uint8Array };

const MOST_HEADER_BYTES = 256 * 1024;

const FIRST_READ_BYTES = 16 * 1024;

const STORED = 0;

const LOCAL_HEADER_BYTES = 30;

const LOCAL_HEADER_SIGNATURE = 0x04034b50;

function joined(head: Uint8Array, tail: Uint8Array): Uint8Array {
  const all = new Uint8Array(head.byteLength + tail.byteLength);
  all.set(head);
  all.set(tail, head.byteLength);
  return all;
}

async function storedDataStart(archive: Blob, entry: FileEntry): Promise<number | null> {
  const bytes = await archive.slice(entry.offset, entry.offset + LOCAL_HEADER_BYTES).arrayBuffer();
  const header = new DataView(bytes);
  if (header.byteLength < LOCAL_HEADER_BYTES) return null;
  if (header.getUint32(0, true) !== LOCAL_HEADER_SIGNATURE) return null;
  return (
    entry.offset + LOCAL_HEADER_BYTES + header.getUint16(26, true) + header.getUint16(28, true)
  );
}

async function storedHeader(
  archive: Blob,
  start: number,
  entry: FileEntry,
): Promise<HeaderReading> {
  const end = start + Math.min(entry.compressedSize, MOST_HEADER_BYTES);
  let length = FIRST_READ_BYTES;
  for (;;) {
    const upTo = Math.min(start + length, end);
    const bytes = new Uint8Array(await archive.slice(start, upTo).arrayBuffer());
    const reading = readImageHeader(bytes);
    if (reading.kind !== 'short' || upTo >= end) return reading;
    length *= 4;
  }
}

async function streamedHeader(entry: FileEntry): Promise<HeaderReading> {
  const stop = new AbortController();
  const read: HeaderRead = { reading: { kind: 'short' }, bytes: new Uint8Array(0) };
  const sink = new WritableStream<Uint8Array>({
    write(chunk) {
      read.bytes = joined(read.bytes, chunk);
      read.reading = readImageHeader(read.bytes);
      if (read.reading.kind !== 'short' || read.bytes.byteLength >= MOST_HEADER_BYTES) {
        stop.abort();
      }
    },
  });

  await entry.getData(sink, { signal: stop.signal, useWebWorkers: false }).catch(() => undefined);
  return read.reading;
}

async function entryHeader(archive: Blob, entry: FileEntry): Promise<HeaderReading> {
  if (entry.compressionMethod !== STORED || entry.encrypted) return streamedHeader(entry);
  const start = await storedDataStart(archive, entry);
  if (start === null) return streamedHeader(entry);
  return storedHeader(archive, start, entry);
}

async function entryImageSize(archive: Blob, entry: FileEntry): Promise<Size | null> {
  try {
    const reading = await entryHeader(archive, entry);
    return reading.kind === 'size' ? reading.size : null;
  } catch {
    return null;
  }
}

async function entryImageSizes(
  archive: Blob,
  entries: readonly FileEntry[],
  closed: () => boolean,
  closedCause: string,
): Promise<SizesRead> {
  const sizes: (Size | null)[] = [];
  for (const entry of entries) {
    if (closed()) return { kind: 'source-unreadable', cause: closedCause };
    sizes.push(await entryImageSize(archive, entry));
  }
  return { kind: 'success', sizes };
}

export { entryImageSizes };
