export function isAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

export function flatName(key: string): string {
  const rejected =
    key.length === 0 || key.includes('/') || key.includes('\\') || key.includes('..');
  if (rejected) throw new Error(`Key "${key}" is not a flat name`);
  return key;
}

export function isMissing(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'NotFoundError';
}

export async function directoryNamed(name: string): Promise<FileSystemDirectoryHandle> {
  if (!isAvailable()) throw new Error('The origin private file system is unavailable');
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(name, { create: true });
}
