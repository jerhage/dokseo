import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../domain/model-consent';
import { JAPANESE_OCR_MODEL, type ModelFootprint } from '../domain/model-footprint';
import type {
  RecognizerSetupStore,
  SetupError,
  StoredRecognizerSetup,
} from '../domain/recognizer-setup';
import { grantModelConsent } from './grant-model-consent';

type World = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
  readonly steps: string[];
  readonly recorded: (ModelFootprint | null)[];
  readonly requestPersistence: () => Promise<boolean>;
};

function world(options: { readonly persisted?: boolean; readonly failed?: boolean } = {}): World {
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
      read: (language: Language): Promise<Result<StoredRecognizerSetup | null, SetupError>> => {
        steps.push(`setup ${language}`);
        return Promise.resolve(ok(null));
      },
      write: () => Promise.resolve(ok(undefined)),
    },
    consent: {
      decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>> {
        return Promise.resolve(ok(granted.has(language) ? 'granted' : 'undecided'));
      },
      recordGrant(
        language: Language,
        model: ModelFootprint | null,
      ): Promise<Result<void, ModelConsentError>> {
        steps.push(`record ${language}`);
        recorded.push(model);
        if (options.failed === true) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
        }
        granted.add(language);
        return Promise.resolve(ok(undefined));
      },
      forgetGrant(language: Language): Promise<Result<void, ModelConsentError>> {
        steps.push(`forget ${language}`);
        granted.delete(language);
        return Promise.resolve(ok(undefined));
      },
    },
  };
}

describe('grantModelConsent', () => {
  it('requests the persistence grant before it records the decision', async () => {
    const fakes = world();

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(ok(undefined));
    expect(fakes.steps).toEqual(['setup ja', 'persistence', 'record ja']);
  });

  it('records the grant against the model the reader chose', async () => {
    const fakes = world();

    await grantModelConsent(fakes, 'ja');

    expect(fakes.recorded).toEqual([JAPANESE_OCR_MODEL]);
  });

  it('records no model for a language that offers none', async () => {
    const fakes = world();

    await grantModelConsent(fakes, 'ko');

    expect(fakes.recorded).toEqual([null]);
  });

  it('records the grant for one language and leaves the other undecided', async () => {
    const fakes = world();

    await grantModelConsent(fakes, 'ja');

    expect(await fakes.consent.decisionFor('ja', JAPANESE_OCR_MODEL)).toEqual(ok('granted'));
    expect(await fakes.consent.decisionFor('ko', null)).toEqual(ok('undecided'));
  });

  it('records the grant even when the browser refuses persistence', async () => {
    const fakes = world({ persisted: false });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(ok(undefined));
    expect(await fakes.consent.decisionFor('ja', JAPANESE_OCR_MODEL)).toEqual(ok('granted'));
  });

  it('reports a storage failure after it has already requested persistence', async () => {
    const fakes = world({ failed: true });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
    expect(fakes.steps).toEqual(['setup ja', 'persistence', 'record ja']);
  });
});
