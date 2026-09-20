import { describe, expect, it } from 'vitest';
import { deviceName } from './recognizer-session';

describe('deviceName', () => {
  it('calls the WebGPU device the GPU, in a word a reader knows', () => {
    expect(deviceName('webgpu')).toBe('GPU');
  });

  it('calls the WASM device the CPU, which is where that path runs', () => {
    expect(deviceName('wasm')).toBe('CPU');
  });
});
