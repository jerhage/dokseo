import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../domain/model-consent';
import { grantModelConsent } from './grant-model-consent';

type World = {
  readonly consent: ModelConsentStore;
  readonly steps: string[];
  readonly requestPersistence: () => Promise<boolean>;
};

function world(options: { readonly persisted?: boolean; readonly failed?: boolean } = {}): World {
  const steps: string[] = [];
  const granted = new Set<Language>();

  return {
    steps,
    requestPersistence: () => {
      steps.push('persistence');
      return Promise.resolve(options.persisted ?? true);
    },
    consent: {
      decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>> {
        return Promise.resolve(ok(granted.has(language) ? 'granted' : 'undecided'));
      },
      recordGrant(language: Language): Promise<Result<void, ModelConsentError>> {
        steps.push(`record ${language}`);
        if (options.failed === true) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
        }
        granted.add(language);
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
    expect(fakes.steps).toEqual(['persistence', 'record ja']);
  });

  it('records the grant for one language and leaves the other undecided', async () => {
    const fakes = world();

    await grantModelConsent(fakes, 'ja');

    expect(await fakes.consent.decisionFor('ja')).toEqual(ok('granted'));
    expect(await fakes.consent.decisionFor('ko')).toEqual(ok('undecided'));
  });

  it('records the grant even when the browser refuses persistence', async () => {
    const fakes = world({ persisted: false });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(ok(undefined));
    expect(await fakes.consent.decisionFor('ja')).toEqual(ok('granted'));
  });

  it('reports a storage failure after it has already requested persistence', async () => {
    const fakes = world({ failed: true });

    const recorded = await grantModelConsent(fakes, 'ja');

    expect(recorded).toEqual(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
    expect(fakes.steps).toEqual(['persistence', 'record ja']);
  });
});
