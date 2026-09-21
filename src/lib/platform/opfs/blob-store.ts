import { describeCause } from '$lib/shared/cause';
import { directoryNamed, flatName, isAvailable, isMissing } from './directory';
import { createBlobWriter } from './worker-blob-writer';
import type { BytesWritten } from './worker-blob-writer';

const DIRECTORY = 'blobs';

function startWriterWorker(): Worker {
  return new Worker(new URL('$workers/opfs-writer.worker.ts', import.meta.url), {
    type: 'module',
  });
}

const writeBlob = createBlobWriter({ directory: DIRECTORY, startWorker: startWriterWorker });

function directory(): Promise<FileSystemDirectoryHandle> {
  return directoryNamed(DIRECTORY);
}

async function put(
  key: string,
  blob: Blob,
  onWritten: BytesWritten = () => undefined,
): Promise<void> {
  await writeBlob(flatName(key), blob, onWritten);
}

async function get(key: string): Promise<Blob | null> {
  const name = flatName(key);
  const parent = await directory();
  try {
    const handle = await parent.getFileHandle(name);
    return await handle.getFile();
  } catch (cause) {
    if (isMissing(cause)) return null;
    throw new Error(`Key "${name}" could not be read: ${describeCause(cause)}`, { cause });
  }
}

async function totalBytes(): Promise<number> {
  const parent = await directory();
  let total = 0;
  for await (const handle of parent.values()) {
    if (handle.kind === 'file') total += (await handle.getFile()).size;
  }
  return total;
}

async function remove(key: string): Promise<void> {
  const name = flatName(key);
  const parent = await directory();
  try {
    await parent.removeEntry(name);
  } catch (cause) {
    if (isMissing(cause)) return;
    throw new Error(`Key "${name}" could not be removed: ${describeCause(cause)}`, { cause });
  }
}

export { isAvailable, put, get, totalBytes, remove };
export type { BytesWritten };
