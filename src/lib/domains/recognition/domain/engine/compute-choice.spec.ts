import { describe, expect, it } from 'vitest';
import {
  chosenDevice,
  computeChoiceName,
  computeChoiceOf,
  computeDetectionNote,
  computeGpuWarning,
  GPU_UNDETECTED,
} from './compute-choice';

describe('chosenDevice', () => {
  it('runs on the CPU when the reader left the choice to the app', () => {
    expect(chosenDevice('auto', true)).toBe('wasm');
  });

  it('leaves the GPU to a reader who asked for it', () => {
    expect(chosenDevice('gpu', true)).toBe('webgpu');
  });

  it('runs on the CPU when nothing was forced and no adapter answered', () => {
    expect(chosenDevice('auto', false)).toBe('wasm');
  });

  it('runs on the CPU when the CPU was forced and an adapter was available', () => {
    expect(chosenDevice('cpu', true)).toBe('wasm');
  });

  it('falls back to the CPU when the GPU was forced and no adapter answered', () => {
    expect(chosenDevice('gpu', false)).toBe('wasm');
  });

  it('runs on the GPU when the GPU was forced and an adapter answered', () => {
    expect(chosenDevice('gpu', true)).toBe('webgpu');
  });
});

describe('computeChoiceOf', () => {
  it('reads a stored choice back', () => {
    expect(computeChoiceOf('gpu')).toBe('gpu');
    expect(computeChoiceOf('cpu')).toBe('cpu');
  });

  it('treats a missing or unknown choice as the CPU, the steady one', () => {
    expect(computeChoiceOf(null)).toBe('cpu');
    expect(computeChoiceOf(undefined)).toBe('cpu');
    expect(computeChoiceOf('tpu')).toBe('cpu');
  });

  it('keeps a choice the reader actually made', () => {
    expect(computeChoiceOf('gpu')).toBe('gpu');
    expect(computeChoiceOf('auto')).toBe('auto');
    expect(computeChoiceOf('cpu')).toBe('cpu');
  });
});

describe('computeChoiceName', () => {
  it('names each choice in words', () => {
    expect(computeChoiceName('auto')).toBe('Automatic');
    expect(computeChoiceName('gpu')).toBe('GPU (WebGPU)');
    expect(computeChoiceName('cpu')).toBe('CPU');
  });
});

describe('computeDetectionNote', () => {
  const found = { available: true, description: null };

  it('says the CPU is in use even where a GPU was found, when the app chose', () => {
    expect(computeDetectionNote(found, 'auto')).toBe('Using: CPU. Detected: WebGPU available.');
  });

  it('says the GPU is in use when the reader asked for it', () => {
    expect(computeDetectionNote(found, 'gpu')).toBe('Using: GPU. Detected: WebGPU available.');
  });

  it('says the CPU is in use when the reader asked for it', () => {
    expect(computeDetectionNote(found, 'cpu')).toBe('Using: CPU. Detected: WebGPU available.');
  });

  it('says the CPU is in use when no adapter was found, whatever was asked', () => {
    expect(computeDetectionNote(GPU_UNDETECTED, 'gpu')).toBe(
      'Using: CPU. Detected: no WebGPU adapter.',
    );
  });

  it('names the adapter when the browser described one', () => {
    expect(computeDetectionNote({ available: true, description: 'apple m2' }, 'gpu')).toBe(
      'Using: GPU. Detected: apple m2, WebGPU available.',
    );
  });
});

describe('computeGpuWarning', () => {
  it('says nothing to a reader who left the choice to the app', () => {
    expect(computeGpuWarning('auto')).toBeNull();
  });

  it('warns that browser support for the GPU is still shaky', () => {
    expect(computeGpuWarning('gpu')).toContain('still shaky');
  });

  it('promises the fallback, so a refusal is not a dead end', () => {
    expect(computeGpuWarning('gpu')).toContain('falls back to the CPU');
  });

  it('names no browser, because a refusal is found by trying', () => {
    const warning = computeGpuWarning('gpu') ?? '';

    expect(warning).not.toContain('Firefox');
    expect(warning).not.toContain('Safari');
    expect(warning).not.toContain('Chrome');
  });

  it('says nothing to a reader who already chose the CPU', () => {
    expect(computeGpuWarning('cpu')).toBeNull();
  });
});
