import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../domain/model-consent';
import type { ModelStorageReport } from '../domain/model-cache';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';
import { deleteModel } from './delete-model';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const REMOVED: ModelStorageReport = { modelId: MODEL, files: 9, bytes: 204_413_485, unsized: 0 };

function world(options: { readonly removal?: Result<ModelStorageReport, ModelStorageError> } = {}) {
  const steps: string[] = [];
  const granted = new Set<Language>(['ja']);

  const storage: ModelStorage = {
    measure: () => Promise.resolve(ok(REMOVED)),
    remove: (modelId: string) => {
      steps.push(`remove ${modelId}`);
      return Promise.resolve(options.removal ?? ok(REMOVED));
    },
  };

  const consent: ModelConsentStore = {
    decisionFor: (language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>> =>
      Promise.resolve(ok(granted.has(language) ? 'granted' : 'undecided')),
    recordGrant: () => Promise.resolve(ok(undefined)),
    forgetGrant: (language: Language) => {
      steps.push(`forget ${language}`);
      granted.delete(language);
      return Promise.resolve(ok(undefined));
    },
  };

  return { deps: { storage, consent }, steps, consent, granted };
}

describe('deleteModel', () => {
  it('reports what the browser actually removed', async () => {
    const { deps } = world();
    const removed = await deleteModel(deps, 'ja', MODEL);

    if (!removed.ok) throw new Error('The removal failed');
    expect(removed.value).toEqual(REMOVED);
  });

  it('withdraws the grant, so the next download is agreed to again', async () => {
    const { deps, consent } = world();
    await deleteModel(deps, 'ja', MODEL);

    const decision = await consent.decisionFor('ja', null);
    if (!decision.ok) throw new Error('The decision could not be read');
    expect(decision.value).toBe('undecided');
  });

  it('frees the space before it withdraws the grant', async () => {
    const { deps, steps } = world();
    await deleteModel(deps, 'ja', MODEL);

    expect(steps).toEqual([`remove ${MODEL}`, 'forget ja']);
  });

  it('keeps the grant when nothing could be removed', async () => {
    const { deps, steps } = world({ removal: err({ kind: 'cache-unavailable' }) });
    const removed = await deleteModel(deps, 'ja', MODEL);

    expect(removed.ok).toBe(false);
    expect(steps).toEqual([`remove ${MODEL}`]);
  });
});
