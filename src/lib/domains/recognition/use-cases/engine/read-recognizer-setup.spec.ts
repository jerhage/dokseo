import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type {
  RecognizerSetupStore,
  SetupError,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { readRecognizerSetup } from './read-recognizer-setup';

function storeHolding(
  record: StoredRecognizerSetup | null,
  failure: SetupError | null = null,
): RecognizerSetupStore {
  return {
    read: (): Promise<Result<StoredRecognizerSetup | null, SetupError>> =>
      Promise.resolve(failure === null ? ok(record) : err(failure)),
    write: () => Promise.resolve(ok(undefined)),
  };
}

async function choiceFrom(record: StoredRecognizerSetup | null, language: Language = 'ja') {
  const read = await readRecognizerSetup({ setups: storeHolding(record) }, language);
  if (!read.ok) throw new Error('The setup could not be read');
  return read.value;
}

describe('readRecognizerSetup', () => {
  it('returns the stored model and the stored compute choice', async () => {
    const choice = await choiceFrom({
      language: 'ja',
      modelId: JAPANESE_OCR_MODEL.modelId,
      compute: 'cpu',
    });

    expect(choice.model).toEqual(JAPANESE_OCR_MODEL);
    expect(choice.compute).toBe('cpu');
  });

  it('defaults to the offered model and the CPU when nothing was stored', async () => {
    const choice = await choiceFrom(null);

    expect(choice.model).toEqual(JAPANESE_OCR_MODEL);
    expect(choice.compute).toBe('cpu');
  });

  it('falls back to an offered model rather than a stored id nobody publishes', async () => {
    const choice = await choiceFrom({ language: 'ja', modelId: 'dnouv/manga-ocr' });

    expect(choice.model).toEqual(JAPANESE_OCR_MODEL);
  });

  it('passes on the failure of a store that cannot be read', async () => {
    const read = await readRecognizerSetup(
      { setups: storeHolding(null, { kind: 'storage-unavailable' }) },
      'ja',
    );

    expect(read).toEqual(err({ kind: 'storage-unavailable' }));
  });

  it('defaults each language to a model that can read it', async () => {
    const choice = await choiceFrom(null, 'ko');

    expect(choice.model?.modelId).toBe('PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx');
  });
});
