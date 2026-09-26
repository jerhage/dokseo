import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { PageSource } from '$lib/shared/page-source';
import { openArchivePageSource } from './archive-page-source';

const decode = vi.fn();

async function archive(): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  await writer.add('002.jpg', new TextReader('second page bytes'), { level: 0 });
  await writer.add('001.jpg', new TextReader('first page bytes'), { level: 0 });
  return writer.close();
}

class FlakyBlob extends Blob {
  broken = false;

  override slice(start?: number, end?: number, type?: string): Blob {
    if (this.broken) throw new Error('the archive is damaged');
    return super.slice(start, end, type);
  }
}

async function flaky(): Promise<FlakyBlob> {
  return new FlakyBlob([await (await archive()).arrayBuffer()], { type: 'application/zip' });
}

const DISK_CHUNK_BYTES = 64 * 1024;

class CountedPart extends Blob {
  readonly #count: (bytes: number) => void;

  constructor(part: Blob, count: (bytes: number) => void) {
    super([part]);
    this.#count = count;
  }

  override async arrayBuffer(): Promise<ArrayBuffer> {
    this.#count(this.size);
    return super.arrayBuffer();
  }

  override stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    let offset = 0;
    return new ReadableStream<Uint8Array<ArrayBuffer>>(
      {
        pull: async (controller) => {
          if (offset >= this.size) {
            controller.close();
            return;
          }
          const chunk = this.slice(offset, offset + DISK_CHUNK_BYTES);
          offset += chunk.size;
          this.#count(chunk.size);
          controller.enqueue(new Uint8Array(await chunk.arrayBuffer()));
        },
      },
      { highWaterMark: 0 },
    );
  }
}

class CountingBlob extends Blob {
  read = 0;

  override slice(start?: number, end?: number, type?: string): Blob {
    return new CountedPart(super.slice(start, end, type), (bytes) => {
      this.read += bytes;
    });
  }
}

function pngHeader(width: number, height: number, padding: number): Uint8Array {
  const header = new Uint8Array(33 + padding);
  const view = new DataView(header.buffer);
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  view.setUint32(16, width);
  view.setUint32(20, height);
  for (let at = 33; at < header.length; at += 1) header[at] = (at * 7919) % 251;
  return header;
}

function turnedJpegHeader(width: number, height: number): Uint8Array {
  const exif = [
    0xff, 0xe1, 0, 34, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01,
    0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0,
  ];
  const frame = [
    0xff,
    0xc0,
    0,
    11,
    8,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    1,
    1,
    0x11,
    0,
  ];
  return new Uint8Array([0xff, 0xd8, ...exif, ...frame, 0xff, 0xda, 0, 2]);
}

async function imageArchive(level: number): Promise<CountingBlob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  await writer.add('001.png', new Uint8ArrayReader(pngHeader(800, 2400, 2_000_000)), { level });
  await writer.add('002.jpg', new Uint8ArrayReader(turnedJpegHeader(800, 600)), { level });
  await writer.add('003.jpg', new TextReader('not an image at all'), { level });
  const zipped = await writer.close();
  return new CountingBlob([await zipped.arrayBuffer()], { type: 'application/zip' });
}

async function opened(): Promise<PageSource> {
  const source = await openArchivePageSource(await archive());
  if (!source.ok) throw new Error('the archive could not be opened');
  return source.value;
}

beforeEach(() => {
  decode.mockReset();
  vi.stubGlobal('createImageBitmap', decode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openArchivePageSource', () => {
  it('hands back an encoded picture without decoding the entry', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({ ok: true, value: { kind: 'encoded', url: expect.any(String) } });
    expect(decode).not.toHaveBeenCalled();
  });

  it('reports an unreadable page, not a decode failure, when the entry will not read', async () => {
    const blob = await flaky();
    const source = await openArchivePageSource(blob);
    if (!source.ok) throw new Error('the archive could not be opened');
    using pages = source.value;
    blob.broken = true;

    const picture = await pages.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: { kind: 'page-unreadable', index: 0, cause: expect.any(String) },
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it('separates an unreadable entry from an entry that will not decode', async () => {
    using source = await opened();
    decode.mockRejectedValue(new Error('not an image'));

    const image = await source.image(imageIndex(0));

    expect(image).toEqual({
      ok: false,
      error: { kind: 'decode-failed', index: 0, cause: expect.stringContaining('not an image') },
    });
  });

  it('mints a fresh url for every call', async () => {
    using source = await opened();

    const first = await source.picture(imageIndex(0));
    const second = await source.picture(imageIndex(0));

    expect(first.ok && second.ok).toBe(true);
    expect(first.ok ? first.value : null).not.toEqual(second.ok ? second.value : null);
  });

  it('rejects a picture outside the archive', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(7));

    expect(picture).toEqual({ ok: false, error: { kind: 'out-of-range', index: 7, count: 2 } });
  });

  it('rejects a picture once the archive is closed', async () => {
    const source = await opened();
    source.close();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: { kind: 'source-unreadable', cause: 'The archive is closed' },
    });
  });

  it.each([
    ['stored', 0],
    ['deflated', 6],
  ])('reads each size from the %s entry header, turned as the image is shown', async (_, level) => {
    const blob = await imageArchive(level);
    const source = await openArchivePageSource(blob);
    if (!source.ok) throw new Error('the archive could not be opened');
    using pages = source.value;

    const sizes = await pages.sizes();

    expect(sizes).toEqual({
      ok: true,
      value: [{ width: 800, height: 2400 }, { width: 600, height: 800 }, null],
    });
  });

  it('reads the head of a large entry, not the whole of it', async () => {
    const blob = await imageArchive(0);
    const source = await openArchivePageSource(blob);
    if (!source.ok) throw new Error('the archive could not be opened');
    using pages = source.value;
    blob.read = 0;

    await pages.sizes();

    expect(blob.size).toBeGreaterThan(2_000_000);
    expect(blob.read).toBeLessThan(DISK_CHUNK_BYTES);
  });

  it('reports no sizes once the archive is closed', async () => {
    const source = await opened();
    source.close();

    const sizes = await source.sizes();

    expect(sizes).toEqual({
      ok: false,
      error: { kind: 'source-unreadable', cause: 'The archive is closed' },
    });
  });
});
