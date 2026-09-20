type RecognizerDevice = 'webgpu' | 'wasm';

type RecognizerSession = {
  readonly modelId: string;
  readonly device: RecognizerDevice;
};

function deviceName(device: RecognizerDevice): string {
  return device === 'webgpu' ? 'GPU' : 'CPU';
}

export { deviceName };
export type { RecognizerDevice, RecognizerSession };
