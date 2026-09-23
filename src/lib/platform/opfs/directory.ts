function isAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

function flatName(key: string): string {
  const rejected =
    key.length === 0 || key.includes('/') || key.includes('\\') || key.includes('..');
  if (rejected) throw new Error(`Key "${key}" is not a flat name`);
  return key;
}

function isMissing(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'NotFoundError';
}

const NO_FILE_SYSTEM = 'The origin private file system is unavailable';

const PRIVATE_WINDOW =
  'This browser or device will not save files in a private window. Open the library in a normal window to add a book.';

function isRefused(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'SecurityError';
}

async function storageRoot(): Promise<FileSystemDirectoryHandle> {
  try {
    return await navigator.storage.getDirectory();
  } catch (cause) {
    if (isRefused(cause)) throw new Error(PRIVATE_WINDOW, { cause });
    throw cause;
  }
}

async function directoryNamed(name: string): Promise<FileSystemDirectoryHandle> {
  if (!isAvailable()) throw new Error(NO_FILE_SYSTEM);

  const root = await storageRoot();
  return root.getDirectoryHandle(name, { create: true });
}

export {
  directoryNamed,
  flatName,
  isAvailable,
  isMissing,
  NO_FILE_SYSTEM,
  PRIVATE_WINDOW,
  storageRoot,
};
