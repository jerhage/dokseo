import type { ModelLoad, ModelLoadSource } from './model-load';

export type PayloadFile = {
  readonly url: string;
  readonly loadedBytes: number;
  readonly totalBytes: number;
};

export const NO_PAYLOAD: readonly PayloadFile[] = [];

export function trackedPayload(
  files: readonly PayloadFile[],
  url: string,
  totalBytes: number,
  loadedBytes: number,
): readonly PayloadFile[] {
  const tracked: PayloadFile = { url, totalBytes, loadedBytes: Math.min(loadedBytes, totalBytes) };
  return files.some((file) => file.url === url)
    ? files.map((file) => (file.url === url ? tracked : file))
    : [...files, tracked];
}

export function advancedPayload(
  files: readonly PayloadFile[],
  url: string,
  bytes: number,
): readonly PayloadFile[] {
  return files.map((file) =>
    file.url === url
      ? { ...file, loadedBytes: Math.min(file.totalBytes, file.loadedBytes + bytes) }
      : file,
  );
}

export function payloadProgress(files: readonly PayloadFile[], source: ModelLoadSource): ModelLoad {
  const totalBytes = files.reduce((sum, file) => sum + file.totalBytes, 0);
  const loadedBytes = files.reduce((sum, file) => sum + file.loadedBytes, 0);
  const fraction = totalBytes <= 0 ? 0 : Math.min(1, loadedBytes / totalBytes);

  return { fraction, source, loadedBytes, totalBytes };
}
