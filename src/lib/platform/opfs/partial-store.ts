import { describeCause } from '$lib/shared/cause';
import { directoryNamed, flatName, isMissing } from './directory';

const DIRECTORY = 'partials';

type StoredPart = {
  readonly key: string;
  readonly bytes: number;
};

type PartAppend = {
  write(bytes: Uint8Array): void;
  close(): void;
};

type SyncAccess = {
  truncate(to: number): void;
  write(data: Uint8Array, options?: { at?: number }): number;
  flush(): void;
  close(): void;
};

type SyncWritableHandle = FileSystemFileHandle & {
  createSyncAccessHandle?: () => Promise<SyncAccess>;
};

function directory(): Promise<FileSystemDirectoryHandle> {
  return directoryNamed(DIRECTORY);
}

async function fileOf(key: string): Promise<File | null> {
  const name = flatName(key);
  const parent = await directory();
  try {
    const handle = await parent.getFileHandle(name);
    return await handle.getFile();
  } catch (cause) {
    if (isMissing(cause)) return null;
    throw new Error(`Part "${name}" could not be read: ${describeCause(cause)}`, { cause });
  }
}

async function sizeOf(key: string): Promise<number> {
  const file = await fileOf(key);
  return file?.size ?? 0;
}

async function openAppend(key: string, from: number): Promise<PartAppend> {
  const name = flatName(key);
  const handle: SyncWritableHandle = await (
    await directory()
  ).getFileHandle(name, {
    create: true,
  });

  const open = handle.createSyncAccessHandle;
  if (open === undefined) {
    throw new Error('This browser cannot append to a file in the origin private file system');
  }

  const access = await open.call(handle);
  let at = from;
  try {
    access.truncate(from);
  } catch (cause) {
    access.close();
    throw new Error(`Part "${name}" could not be trimmed: ${describeCause(cause)}`, { cause });
  }

  return {
    write(bytes: Uint8Array): void {
      access.write(bytes, { at });
      at += bytes.byteLength;
    },
    close(): void {
      try {
        access.flush();
      } finally {
        access.close();
      }
    },
  };
}

async function remove(key: string): Promise<void> {
  const name = flatName(key);
  const parent = await directory();
  try {
    await parent.removeEntry(name);
  } catch (cause) {
    if (isMissing(cause)) return;
    throw new Error(`Part "${name}" could not be removed: ${describeCause(cause)}`, { cause });
  }
}

async function readableSize(handle: FileSystemFileHandle): Promise<number | null> {
  try {
    const file = await handle.getFile();
    return file.size;
  } catch {
    return null;
  }
}

async function entries(): Promise<readonly StoredPart[]> {
  const parent = await directory();
  const found: StoredPart[] = [];

  for await (const handle of parent.values()) {
    if (handle.kind !== 'file') continue;
    const bytes = await readableSize(handle);
    if (bytes !== null) found.push({ key: handle.name, bytes });
  }

  return found;
}

export { fileOf, sizeOf, openAppend, remove, entries };
export type { StoredPart, PartAppend };
