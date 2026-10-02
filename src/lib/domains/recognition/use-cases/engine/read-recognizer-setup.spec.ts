import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import {
  JAPANESE_FULL_DECODER_MODEL,
  JAPANESE_OCR_MODEL,
} from '../../domain/model/model-footprint';
import type {
  RecognizerSetupStore,
  SetupLookup,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { readRecognizerSetup } from './read-recognizer-setup';

function storeAnswering(read: SetupLookup): RecognizerSetupStore {
  return {
    read: () => Promise.resolve(read),
    write: () => Promise.resolve({ kind: 'success' }),
  };
}

function storeHolding(record: StoredRecognizerSetup | null): RecognizerSetupStore {
  return storeAnswering({ kind: 'success', stored: record });
}

async function choiceFrom(record: StoredRecognizerSetup | null, language: Language = 'ja') {
  const read = await readRecognizerSetup({ setups: storeHolding(record) }, language);
  if (read.kind !== 'success') throw new Error('The setup could not be read');
  return read.choice;
}

describe('readRecognizerSetup', () => {
  it('returns the stored model and the stored compute choice', async () => {
    const choice = await choiceFrom({
      language: 'ja',
      modelId: JAPANESE_FULL_DECODER_MODEL.modelId,
      compute: 'gpu',
    });

    expect(choice.model).toEqual(JAPANESE_FULL_DECODER_MODEL);
    expect(choice.compute).toBe('gpu');
  });

  it.each([
    ['ja', JAPANESE_OCR_MODEL.modelId],
    ['ko', 'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx'],
  ] as const)(
    'defaults %s to the offered model and the CPU when nothing was stored',
    async (language, modelId) => {
      const choice = await choiceFrom(null, language);

      expect(choice.model?.modelId).toBe(modelId);
      expect(choice.compute).toBe('cpu');
    },
  );

  it('passes a blocked store through', async () => {
    const read = await readRecognizerSetup({ setups: storeAnswering(STORAGE_UNAVAILABLE) }, 'ja');

    expect(read).toEqual(STORAGE_UNAVAILABLE);
  });
});
