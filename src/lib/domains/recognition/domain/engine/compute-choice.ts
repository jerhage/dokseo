import { match } from 'ts-pattern';
import { deviceName } from './recognizer-session';
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
    .with('auto', () => 'wasm' as const)
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

function detectionOf(detection: GpuDetection): string {
  if (!detection.available) return 'no WebGPU adapter';
  if (detection.description === null) return 'WebGPU available';

  return `${detection.description}, WebGPU available`;
}

function computeDetectionNote(detection: GpuDetection, choice: ComputeChoice): string {
  const using = deviceName(chosenDevice(choice, detection.available));

  return `Using: ${using}. Detected: ${detectionOf(detection)}.`;
}

function computeGpuWarning(choice: ComputeChoice): string | null {
  if (choice !== 'gpu') return null;

  return 'Browser support for the GPU is still shaky, so this may be unstable. If the GPU will not run a model, recognition falls back to the CPU on its own.';
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
