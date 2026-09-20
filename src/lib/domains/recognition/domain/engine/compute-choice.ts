import { match } from 'ts-pattern';
import type { RecognizerDevice } from './recognizer-session';

export type ComputeChoice = 'auto' | 'gpu' | 'cpu';

export const COMPUTE_CHOICES: readonly ComputeChoice[] = ['auto', 'gpu', 'cpu'];

export type GpuDetection = {
  readonly available: boolean;
  readonly description: string | null;
};

export const GPU_UNDETECTED: GpuDetection = { available: false, description: null };

export function chosenDevice(choice: ComputeChoice, gpuAvailable: boolean): RecognizerDevice {
  return match(choice)
    .with('cpu', () => 'wasm' as const)
    .with('gpu', () => (gpuAvailable ? ('webgpu' as const) : ('wasm' as const)))
    .with('auto', () => (gpuAvailable ? ('webgpu' as const) : ('wasm' as const)))
    .exhaustive();
}

export function computeChoiceOf(value: unknown): ComputeChoice {
  return value === 'gpu' || value === 'cpu' ? value : 'auto';
}

export function computeChoiceName(choice: ComputeChoice): string {
  return match(choice)
    .with('auto', () => 'Automatic')
    .with('gpu', () => 'GPU (WebGPU)')
    .with('cpu', () => 'CPU')
    .exhaustive();
}

export function computeDetectionNote(detection: GpuDetection): string {
  if (!detection.available) {
    return 'Detected: no WebGPU adapter. Recognition runs on the CPU.';
  }

  return detection.description === null
    ? 'Detected: WebGPU available.'
    : `Detected: ${detection.description}, WebGPU available.`;
}
