import { describe, expect, it } from 'vitest';
import {
  chosenDevice,
  computeChoiceName,
  computeCpuNote,
  computeChoiceOf,
  computeDetectionNote,
  computeGpuWarning,
  GPU_UNDETECTED,
} from './compute-choice';

describe('chosenDevice', () => {
  it.each([
    { choice: 'auto', adapter: true, device: 'wasm' },
    { choice: 'auto', adapter: false, device: 'wasm' },
    { choice: 'cpu', adapter: true, device: 'wasm' },
    { choice: 'gpu', adapter: false, device: 'wasm' },
    { choice: 'gpu', adapter: true, device: 'webgpu' },
  ] as const)(
    'runs on $device for the choice $choice when an adapter answered is $adapter',
    ({ choice, adapter, device }) => {
      expect(chosenDevice(choice, adapter)).toBe(device);
    },
  );
});

describe('computeChoiceOf', () => {
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

  it.each([
    { choice: 'auto', note: 'Using: CPU. Detected: WebGPU available.' },
    { choice: 'gpu', note: 'Using: GPU. Detected: WebGPU available.' },
    { choice: 'cpu', note: 'Using: CPU. Detected: WebGPU available.' },
  ] as const)(
    'says which device is in use for the choice $choice where a GPU was found',
    ({ choice, note }) => {
      expect(computeDetectionNote(found, choice)).toBe(note);
    },
  );

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

describe('computeCpuNote', () => {
  it('reassures a reader on the CPU that it is enough for a modern device', () => {
    const note = computeCpuNote('cpu') ?? '';

    expect(note).toContain('stable choice');
    expect(note).toContain('fast enough');
  });

  it('says the same when the app made the choice, because the app chose the CPU', () => {
    expect(computeCpuNote('auto')).toBe(computeCpuNote('cpu'));
  });

  it('says nothing to a reader who asked for the GPU', () => {
    expect(computeCpuNote('gpu')).toBeNull();
  });
});

describe('computeGpuWarning', () => {
  it.each(['auto', 'cpu'] as const)('says nothing to a reader whose choice is %s', (choice) => {
    expect(computeGpuWarning(choice)).toBeNull();
  });

  it('warns that browser support for the GPU is still shaky and promises the fallback', () => {
    expect(computeGpuWarning('gpu')).toContain('still shaky');
    expect(computeGpuWarning('gpu')).toContain('falls back to the CPU');
  });

  it('names no browser, because a refusal is found by trying', () => {
    const warning = computeGpuWarning('gpu') ?? '';

    expect(warning).not.toContain('Firefox');
    expect(warning).not.toContain('Safari');
    expect(warning).not.toContain('Chrome');
  });
});
