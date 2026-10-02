import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { ModelConsentStore } from '../../domain/model/model-consent';
import {
  JAPANESE_FULL_DECODER_MODEL,
  JAPANESE_OCR_MODEL,
} from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type {
  RecognizerSetupStore,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { grantModelConsent } from './grant-model-consent';

type World = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
  readonly steps: string[];
  readonly recorded: (ModelFootprint | null)[];
  readonly requestPersistence: () => Promise<boolean>;
};

function world(
  options: {
    readonly persisted?: boolean;
    readonly failed?: boolean;
    readonly stored?: StoredRecognizerSetup;
  } = {},
): World {
  const steps: string[] = [];
  const recorded: (ModelFootprint | null)[] = [];
  const granted = new Set<Language>();

  return {
    steps,
    recorded,
    requestPersistence: () => {
      steps.push('persistence');
      return Promise.resolve(options.persisted ?? true);
    },
    setups: {
      read: (language: Language) => {
        steps.push(`setup ${language}`);
        return Promise.resolve({ kind: 'success', stored: options.stored ?? null });
      },
      write: () => Promise.resolve({ kind: 'success' }),
    },
    consent: {
      decisionFor: (language: Language) =>
        Promise.resolve({
          kind: 'success',
          decision: granted.has(language) ? 'granted' : 'undecided',
        }),
      recordGrant: (language: Language, model: ModelFootprint | null) => {
        steps.push(`record ${language}`);
        recorded.push(model);
        if (options.failed === true) return Promise.resolve(STORAGE_UNAVAILABLE);
        granted.add(language);
        return Promise.resolve({ kind: 'success' });
      },
      forgetGrant: (language: Language) => {
        steps.push(`forget ${language}`);
        granted.delete(language);
        return Promise.resolve({ kind: 'success' });
      },
    },
  };
}

describe('grantModelConsent', () => {
  it('requests the persistence grant before it records the decision', async () => {
    const fakes = world();

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual({ kind: 'success' });
    expect(fakes.steps).toEqual(['setup ja', 'persistence', 'record ja']);
  });

  it.each([
    ['ja', JAPANESE_OCR_MODEL.modelId],
    ['ko', 'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx'],
  ] as const)(
    'records the grant for %s against its default model when the reader chose none',
    async (language, modelId) => {
      const fakes = world();

      await grantModelConsent(fakes, language);

      expect(fakes.steps).toContain(`record ${language}`);
      expect(fakes.recorded.map((model) => model?.modelId)).toEqual([modelId]);
    },
  );

  it('names the model the recognizer setup holds, not the language default', async () => {
    const fakes = world({
      stored: { language: 'ja', modelId: JAPANESE_FULL_DECODER_MODEL.modelId },
    });

    await grantModelConsent(fakes, 'ja');

    expect(fakes.recorded).toEqual([JAPANESE_FULL_DECODER_MODEL]);
  });

  it('records the grant even when the browser refuses persistence', async () => {
    const fakes = world({ persisted: false });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual({ kind: 'success' });
    expect(await fakes.consent.decisionFor('ja', JAPANESE_OCR_MODEL)).toEqual({
      kind: 'success',
      decision: 'granted',
    });
  });

  it('reports a blocked store after it has already requested persistence', async () => {
    const fakes = world({ failed: true });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(STORAGE_UNAVAILABLE);
    expect(fakes.steps).toEqual(['setup ja', 'persistence', 'record ja']);
  });
});
