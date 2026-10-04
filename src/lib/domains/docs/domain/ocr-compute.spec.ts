import { describe, expect, it } from 'vitest';
import { MAX_DEFAULT_WASM_THREADS, defaultWasmThreads } from './ocr-compute';

describe('defaultWasmThreads', () => {
  it('runs one thread when the page is not cross-origin isolated', () => {
    expect(defaultWasmThreads(false, 16)).toBe(1);
  });

  it('uses half the logical cores, rounded up, when isolated', () => {
    expect(defaultWasmThreads(true, 5)).toBe(3);
  });

  it('caps the count at four', () => {
    expect(defaultWasmThreads(true, 16)).toBe(MAX_DEFAULT_WASM_THREADS);
  });

  it('counts an unreported core count as one core', () => {
    expect(defaultWasmThreads(true, 0)).toBe(1);
  });
});
