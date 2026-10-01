import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { recognitionKeys } from '../../queries/recognition-keys';
import { JAPANESE_OCR_MODEL, modelFootprint } from '../../domain/model/model-footprint';
import type { RecognizerChoice, SetupError } from '../../domain/engine/recognizer-setup';
import type { Result } from '$lib/shared/result';
import { readChosenFootprint } from './chosen-footprint';

type SetupRead = () => Promise<Result<RecognizerChoice, SetupError>>;

function reading(answer: SetupRead) {
  return { readRecognizerSetup: answer };
}

describe('readChosenFootprint', () => {
  it('answers the model of the stored setup', async () => {
    const recognition = reading(() =>
      Promise.resolve(ok({ model: modelFootprint('ja'), compute: 'auto' })),
    );

    expect(await readChosenFootprint(createTestQueryClient(), recognition, 'ja')).toEqual(
      modelFootprint('ja'),
    );
  });

  it('answers the default model of the language when the setup read is refused', async () => {
    const recognition = reading(() =>
      Promise.resolve(err({ kind: 'storage-failed', cause: 'locked' })),
    );

    expect(await readChosenFootprint(createTestQueryClient(), recognition, 'ja')).toEqual(
      JAPANESE_OCR_MODEL,
    );
  });

  it('answers the default model of the language when the setup read throws', async () => {
    const recognition = reading(() => Promise.reject(new Error('gone')));

    expect(await readChosenFootprint(createTestQueryClient(), recognition, 'ja')).toEqual(
      JAPANESE_OCR_MODEL,
    );
  });

  it('answers nothing when the stored setup names no model to download', async () => {
    const recognition = reading(() => Promise.resolve(ok({ model: null, compute: 'auto' })));

    expect(await readChosenFootprint(createTestQueryClient(), recognition, 'ja')).toBeNull();
  });

  it('reads through the setup key the settings screen reads', async () => {
    const client = createTestQueryClient();
    const recognition = reading(() =>
      Promise.resolve(ok({ model: modelFootprint('ja'), compute: 'auto' })),
    );

    await readChosenFootprint(client, recognition, 'ja');

    expect(client.getQueryData(recognitionKeys.setup('ja'))).toMatchObject({
      language: 'ja',
      selected: modelFootprint('ja')?.modelId,
    });
  });
});
