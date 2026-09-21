import { match } from 'ts-pattern';
import type { RecognizerDevice } from './recognizer-session';

type ComputeChoice = 'auto' | 'gpu' | 'cpu';

const COMPUTE_CHOICES: readonly ComputeChoice[] = ['auto', 'gpu', 'cpu'];

type GpuDetection = {
  readonly available: boolean;
  readonly description: string | null;
};

const GPU_UNDETECTED: GpuDetection = { available: false, description: null };

function chosenDevice(choice: ComputeChoice, gpuAvailable: boolean): RecognizerDevice {
  return match(choice)
    .with('cpu', () => 'wasm' as const)
    .with('gpu', () => (gpuAvailable ? ('webgpu' as const) : ('wasm' as const)))
    .with('auto', () => (gpuAvailable ? ('webgpu' as const) : ('wasm' as const)))
    .exhaustive();
}

function computeChoiceOf(value: unknown): ComputeChoice {
  return value === 'gpu' || value === 'cpu' ? value : 'auto';
}

function computeChoiceName(choice: ComputeChoice): string {
  return match(choice)
    .with('auto', () => 'Automatic')
    .with('gpu', () => 'GPU (WebGPU)')
    .with('cpu', () => 'CPU')
    .exhaustive();
}

function computeDetectionNote(detection: GpuDetection): string {
  if (!detection.available) {
    return 'Detected: no WebGPU adapter. Recognition runs on the CPU.';
  }

  return detection.description === null
    ? 'Detected: WebGPU available.'
    : `Detected: ${detection.description}, WebGPU available.`;
}

function computeGpuWarning(choice: ComputeChoice): string | null {
  if (choice === 'cpu') return null;

  return 'The GPU is faster where it works. A browser can offer WebGPU and still fail to run a model — Firefox does this with the Japanese engine today. If recognition will not start, choose CPU.';
}

export {
  COMPUTE_CHOICES,
  GPU_UNDETECTED,
  chosenDevice,
  computeChoiceOf,
  computeChoiceName,
  computeDetectionNote,
  computeGpuWarning,
};
export type { ComputeChoice, GpuDetection };
