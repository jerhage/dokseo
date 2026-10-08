import { describeCause } from '$lib/shared/cause';
import { directoryNamed, flatName, isAvailable, isMissing } from './directory';
import { createBlobWriter } from './worker-blob-writer';
import type { BytesWritten } from './worker-blob-writer';

const DIRECTORY = 'blobs';

const UNSUPPORTED_MOVE = 'This browser cannot move a file in the origin private file system';

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

type MovableHandle = FileSystemFileHandle & {
  move?: (parent: FileSystemDirectoryHandle, name: string) => Promise<void>;
};

async function replace(stagedKey: string, key: string): Promise<void> {
  const parent = await directory();
  const handle: MovableHandle = await parent.getFileHandle(flatName(stagedKey));
  if (handle.move === undefined) throw new Error(UNSUPPORTED_MOVE);
  await handle.move(parent, flatName(key));
}

async function totalBytes(): Promise<number> {
  const parent = await directory();
  let total = 0;
  for await (const handle of parent.values()) {
    if (handle.kind === 'file') total += (await handle.getFile()).size;
  }
  return total;
}

async function keys(): Promise<string[]> {
  const parent = await directory();
  const names: string[] = [];
  for await (const handle of parent.values()) {
    if (handle.kind === 'file') names.push(handle.name);
  }
  return names;
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

export { isAvailable, put, get, replace, totalBytes, keys, remove };
export type { BytesWritten };
