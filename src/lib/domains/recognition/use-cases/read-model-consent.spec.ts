import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../domain/model-consent';
import { readModelConsent } from './read-model-consent';

function storeHolding(granted: readonly Language[]): ModelConsentStore {
  return {
    decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      return Promise.resolve(ok(granted.includes(language) ? 'granted' : 'undecided'));
    },
    recordGrant(): Promise<Result<void, ModelConsentError>> {
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
};

describe('readModelConsent', () => {
  it('reports a recorded language as granted', async () => {
    const decision = await readModelConsent({ consent: storeHolding(['ja']) }, 'ja');

    expect(decision).toEqual(ok('granted'));
  });

  it('reports a language with no record as undecided', async () => {
    const decision = await readModelConsent({ consent: storeHolding(['ja']) }, 'ko');

    expect(decision).toEqual(ok('undecided'));
  });

  it('passes a storage failure through rather than guessing a decision', async () => {
    const decision = await readModelConsent({ consent: blocked }, 'ja');

    expect(decision).toEqual(err({ kind: 'storage-unavailable' }));
  });
});
