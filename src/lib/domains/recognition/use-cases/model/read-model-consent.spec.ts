import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { ModelConsentStore } from '../../domain/model/model-consent';
import { JAPANESE_FULL_DECODER_MODEL } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type {
  RecognizerSetupStore,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { readModelConsent } from './read-model-consent';

function setupsHolding(record: StoredRecognizerSetup | null): RecognizerSetupStore {
  return {
    read: () => Promise.resolve({ kind: 'success', stored: record }),
    write: () => Promise.resolve({ kind: 'success' }),
  };
}

function storeHolding(granted: readonly Language[]): ModelConsentStore {
  return {
    decisionFor: (language: Language) =>
      Promise.resolve({
        kind: 'success',
        decision: granted.includes(language) ? 'granted' : 'undecided',
      }),
    recordGrant: () => Promise.resolve({ kind: 'success' }),
    forgetGrant: () => Promise.resolve({ kind: 'success' }),
  };
}

function storeRecording(seen: (ModelFootprint | null)[]): ModelConsentStore {
  return {
    decisionFor: (_language: Language, model: ModelFootprint | null) => {
      seen.push(model);
      return Promise.resolve({ kind: 'success', decision: 'undecided' });
    },
    recordGrant: () => Promise.resolve({ kind: 'success' }),
    forgetGrant: () => Promise.resolve({ kind: 'success' }),
  };
}

const blocked: ModelConsentStore = {
  decisionFor: () => Promise.resolve(STORAGE_UNAVAILABLE),
  recordGrant: () => Promise.resolve(STORAGE_UNAVAILABLE),
  forgetGrant: () => Promise.resolve(STORAGE_UNAVAILABLE),
};

describe('readModelConsent', () => {
  it.each([
    ['ja', 'granted'],
    ['ko', 'undecided'],
  ] as const)('reports the decision the store holds for %s', async (language, decision) => {
    const read = await readModelConsent(
      { consent: storeHolding(['ja']), setups: setupsHolding(null) },
      language,
    );

    expect(read).toEqual({ kind: 'success', decision });
  });

  it('asks about the model the reader chose, not the language default', async () => {
    const seen: (ModelFootprint | null)[] = [];

    await readModelConsent(
      {
        consent: storeRecording(seen),
        setups: setupsHolding({ language: 'ja', modelId: JAPANESE_FULL_DECODER_MODEL.modelId }),
      },
      'ja',
    );

    expect(seen).toEqual([JAPANESE_FULL_DECODER_MODEL]);
  });

  it('asks about the model that reads the language it was asked about', async () => {
    const seen: (ModelFootprint | null)[] = [];

    await readModelConsent({ consent: storeRecording(seen), setups: setupsHolding(null) }, 'ko');

    expect(seen.map((model) => model?.modelId)).toEqual([
      'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx',
    ]);
  });

  it('passes a blocked store through rather than guessing a decision', async () => {
    const decision = await readModelConsent(
      { consent: blocked, setups: setupsHolding(null) },
      'ja',
    );

    expect(decision).toEqual(STORAGE_UNAVAILABLE);
  });
});
