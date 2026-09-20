import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../../domain/model/model-consent';
import { JAPANESE_OCR_MODEL, type ModelFootprint } from '../../domain/model/model-footprint';
import type {
  RecognizerSetupStore,
  SetupError,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { readModelConsent } from './read-model-consent';

function setupsHolding(record: StoredRecognizerSetup | null): RecognizerSetupStore {
  return {
    read: (): Promise<Result<StoredRecognizerSetup | null, SetupError>> =>
      Promise.resolve(ok(record)),
    write: () => Promise.resolve(ok(undefined)),
  };
}

function storeHolding(granted: readonly Language[]): ModelConsentStore {
  return {
    decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      return Promise.resolve(ok(granted.includes(language) ? 'granted' : 'undecided'));
    },
    recordGrant(): Promise<Result<void, ModelConsentError>> {
      return Promise.resolve(ok(undefined));
    },
    forgetGrant(): Promise<Result<void, ModelConsentError>> {
      return Promise.resolve(ok(undefined));
    },
  };
}

function storeRecording(seen: (ModelFootprint | null)[]): ModelConsentStore {
  return {
    decisionFor(
      _language: Language,
      model: ModelFootprint | null,
    ): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      seen.push(model);
      return Promise.resolve(ok('undecided'));
    },
    recordGrant(): Promise<Result<void, ModelConsentError>> {
      return Promise.resolve(ok(undefined));
    },
    forgetGrant(): Promise<Result<void, ModelConsentError>> {
      return Promise.resolve(ok(undefined));
    },
  };
}

const blocked: ModelConsentStore = {
  decisionFor(): Promise<Result<ModelConsentDecision, ModelConsentError>> {
    return Promise.resolve(err({ kind: 'storage-unavailable' }));
  },
  recordGrant(): Promise<Result<void, ModelConsentError>> {
    return Promise.resolve(err({ kind: 'storage-unavailable' }));
  },
  forgetGrant(): Promise<Result<void, ModelConsentError>> {
    return Promise.resolve(err({ kind: 'storage-unavailable' }));
  },
};

describe('readModelConsent', () => {
  it('reports a recorded language as granted', async () => {
    const decision = await readModelConsent(
      { consent: storeHolding(['ja']), setups: setupsHolding(null) },
      'ja',
    );

    expect(decision).toEqual(ok('granted'));
  });

  it('reports a language with no record as undecided', async () => {
    const decision = await readModelConsent(
      { consent: storeHolding(['ja']), setups: setupsHolding(null) },
      'ko',
    );

    expect(decision).toEqual(ok('undecided'));
  });

  it('asks about the model the reader chose, not the language default', async () => {
    const seen: (ModelFootprint | null)[] = [];

    await readModelConsent(
      {
        consent: storeRecording(seen),
        setups: setupsHolding({ language: 'ja', modelId: JAPANESE_OCR_MODEL.modelId }),
      },
      'ja',
    );

    expect(seen).toEqual([JAPANESE_OCR_MODEL]);
  });

  it('asks about the model that reads the language it was asked about', async () => {
    const seen: (ModelFootprint | null)[] = [];

    await readModelConsent({ consent: storeRecording(seen), setups: setupsHolding(null) }, 'ko');

    expect(seen.map((model) => model?.modelId)).toEqual([
      'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx',
    ]);
  });

  it('passes a storage failure through rather than guessing a decision', async () => {
    const decision = await readModelConsent(
      { consent: blocked, setups: setupsHolding(null) },
      'ja',
    );

    expect(decision).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
