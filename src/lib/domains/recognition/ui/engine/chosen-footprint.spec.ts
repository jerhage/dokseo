import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { err, ok } from '$lib/shared/result';
import { modelFootprint } from '../../domain/model/model-footprint';
import { readChosenFootprint } from './chosen-footprint';

function reading(answer: () => Promise<unknown>): Container {
  return { recognition: { readRecognizerSetup: answer } } as unknown as Container;
}

describe('readChosenFootprint', () => {
  it('answers the model of the stored setup', async () => {
    const container = reading(() =>
      Promise.resolve(ok({ model: modelFootprint('ja'), compute: 'auto' })),
    );

    expect(await readChosenFootprint(container, 'ja')).toEqual(modelFootprint('ja'));
  });

  it('answers nothing when the setup read is refused', async () => {
    const container = reading(() => Promise.resolve(err({ kind: 'unreadable', cause: 'x' })));

    expect(await readChosenFootprint(container, 'ja')).toBeNull();
  });

  it('answers nothing when the setup read throws', async () => {
    const container = reading(() => Promise.reject(new Error('gone')));

    expect(await readChosenFootprint(container, 'ja')).toBeNull();
  });
});
