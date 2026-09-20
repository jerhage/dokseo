export type RecognizerDevice = 'webgpu' | 'wasm';

export type RecognizerSession = {
  readonly modelId: string;
  readonly device: RecognizerDevice;
};

export function deviceName(device: RecognizerDevice): string {
  return device === 'webgpu' ? 'GPU' : 'CPU';
}
