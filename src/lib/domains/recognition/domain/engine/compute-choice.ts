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
  return value === 'gpu' || value === 'auto' ? value : 'cpu';
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

  return 'The CPU is the steady choice, and it is what this app uses unless you say otherwise. The GPU can be faster, but browser support for it is still shaky: if the GPU will not run a model, recognition falls back to the CPU on its own.';
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
