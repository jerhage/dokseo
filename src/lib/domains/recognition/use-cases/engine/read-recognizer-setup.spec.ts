import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
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

  it('passes a blocked store through', async () => {
    const read = await readRecognizerSetup({ setups: storeAnswering(STORAGE_UNAVAILABLE) }, 'ja');

    expect(read).toEqual(STORAGE_UNAVAILABLE);
  });

  it('defaults each language to a model that can read it', async () => {
    const choice = await choiceFrom(null, 'ko');

    expect(choice.model?.modelId).toBe('PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx');
  });
});
