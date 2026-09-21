import { describe, expect, it } from 'vitest';
import type { RecognizerDevice } from '$lib/domains/recognition/domain/engine/recognizer-session';
import { openOnDevice } from './device-fallback';

type Opener = {
  readonly asked: RecognizerDevice[];
  open(on: RecognizerDevice): Promise<string>;
};

function opener(refusing: readonly RecognizerDevice[]): Opener {
  const asked: RecognizerDevice[] = [];

  return {
    asked,
    open: (on: RecognizerDevice): Promise<string> => {
      asked.push(on);
      return refusing.includes(on)
        ? Promise.reject(new Error(`${on} would not open the model`))
        : Promise.resolve(`a session on ${on}`);
    },
  };
}

describe('openOnDevice', () => {
  it('reports no fallback when the GPU opens the model', async () => {
    const gpu = opener([]);
    const running = await openOnDevice('webgpu', gpu.open);

    expect(running).toEqual({
      opened: 'a session on webgpu',
      device: 'webgpu',
      fellBackFrom: null,
    });
  });

  it('opens on the CPU when the GPU throws, and says which device refused', async () => {
    const refused = opener(['webgpu']);
    const running = await openOnDevice('webgpu', refused.open);

    expect(running).toEqual({
      opened: 'a session on wasm',
      device: 'wasm',
      fellBackFrom: 'webgpu',
    });
  });

  it('retries once, and only on the CPU', async () => {
    const refused = opener(['webgpu']);
    await openOnDevice('webgpu', refused.open);

    expect(refused.asked).toEqual(['webgpu', 'wasm']);
  });

  it('never reaches for the GPU when the CPU was the device', async () => {
    const cpu = opener(['webgpu']);
    const running = await openOnDevice('wasm', cpu.open);

    expect(running).toEqual({ opened: 'a session on wasm', device: 'wasm', fellBackFrom: null });
    expect(cpu.asked).toEqual(['wasm']);
  });

  it('throws the CPU failure when neither device opens the model', async () => {
    const broken = opener(['webgpu', 'wasm']);

    await expect(openOnDevice('webgpu', broken.open)).rejects.toThrow(
      'wasm would not open the model',
    );
  });
});
