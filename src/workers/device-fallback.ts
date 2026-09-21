import type { RecognizerDevice } from '$lib/domains/recognition/domain/engine/recognizer-session';

type OpenedOn<T> = {
  readonly opened: T;
  readonly device: RecognizerDevice;
  readonly fellBackFrom: RecognizerDevice | null;
};

async function openOnDevice<T>(
  device: RecognizerDevice,
  open: (on: RecognizerDevice) => Promise<T>,
): Promise<OpenedOn<T>> {
  if (device !== 'webgpu') {
    const opened = await open(device);
    return { opened, device, fellBackFrom: null };
  }

  try {
    const opened = await open('webgpu');
    return { opened, device: 'webgpu', fellBackFrom: null };
  } catch {
    const opened = await open('wasm');
    return { opened, device: 'wasm', fellBackFrom: 'webgpu' };
  }
}

export { openOnDevice };
export type { OpenedOn };
