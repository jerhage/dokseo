import { describe, expect, it } from 'vitest';
import {
  chosenDevice,
  computeChoiceName,
  computeChoiceOf,
  computeDetectionNote,
  GPU_UNDETECTED,
} from './compute-choice';

describe('chosenDevice', () => {
  it('runs on the GPU when nothing was forced and an adapter answered', () => {
    expect(chosenDevice('auto', true)).toBe('webgpu');
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

  it('treats a missing or unknown choice as automatic', () => {
    expect(computeChoiceOf(null)).toBe('auto');
    expect(computeChoiceOf(undefined)).toBe('auto');
    expect(computeChoiceOf('tpu')).toBe('auto');
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
  it('says the CPU will run it when no adapter was found', () => {
    expect(computeDetectionNote(GPU_UNDETECTED)).toContain('no WebGPU adapter');
  });

  it('names the adapter when the browser described one', () => {
    const note = computeDetectionNote({ available: true, description: 'apple m2' });
    expect(note).toBe('Detected: apple m2, WebGPU available.');
  });

  it('reports availability alone when the browser described nothing', () => {
    expect(computeDetectionNote({ available: true, description: null })).toBe(
      'Detected: WebGPU available.',
    );
  });
});
