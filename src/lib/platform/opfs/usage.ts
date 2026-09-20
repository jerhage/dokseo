import { isAvailable } from './directory';

type StoredFile = {
  readonly place: string;
  readonly bytes: number | null;
};

const ROOT_PLACE = '';

async function sizeOf(handle: FileSystemFileHandle): Promise<number | null> {
  try {
    return (await handle.getFile()).size;
  } catch {
    return null;
  }
}

async function walk(
  directory: FileSystemDirectoryHandle,
  place: string,
  found: StoredFile[],
): Promise<void> {
  for await (const handle of directory.values()) {
    if (handle.kind === 'directory') {
      await walk(handle, place === ROOT_PLACE ? handle.name : place, found);
      continue;
    }
    found.push({ place, bytes: await sizeOf(handle) });
  }
}

async function storedFiles(): Promise<readonly StoredFile[]> {
  if (!isAvailable()) throw new Error('The origin private file system is unavailable');

  const found: StoredFile[] = [];
  await walk(await navigator.storage.getDirectory(), ROOT_PLACE, found);
  return found;
}

export { storedFiles };
export type { StoredFile };
