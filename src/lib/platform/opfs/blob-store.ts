import { describeCause } from '$lib/shared/cause';
import { directoryNamed, flatName, isMissing } from './directory';

const DIRECTORY = 'blobs';

const WRITE_CHUNK_BYTES = 4 * 1024 * 1024;

export type BytesWritten = (written: number, total: number) => void;

export { isAvailable } from './directory';

function directory(): Promise<FileSystemDirectoryHandle> {
  return directoryNamed(DIRECTORY);
}

export async function put(
  key: string,
  blob: Blob,
  onWritten: BytesWritten = () => undefined,
): Promise<void> {
  const name = flatName(key);
  const handle = await (await directory()).getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    let written = 0;
    onWritten(written, blob.size);
    while (written < blob.size) {
      const end = Math.min(written + WRITE_CHUNK_BYTES, blob.size);
      await writable.write(blob.slice(written, end));
      written = end;
      onWritten(written, blob.size);
    }
    await writable.close();
  } catch (cause) {
    await writable.abort().catch(() => undefined);
    throw new Error(`Key "${name}" could not be written: ${describeCause(cause)}`, { cause });
  }
}

export async function get(key: string): Promise<Blob | null> {
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

export async function remove(key: string): Promise<void> {
  const name = flatName(key);
  const parent = await directory();
  try {
    await parent.removeEntry(name);
  } catch (cause) {
    if (isMissing(cause)) return;
    throw new Error(`Key "${name}" could not be removed: ${describeCause(cause)}`, { cause });
  }
}
