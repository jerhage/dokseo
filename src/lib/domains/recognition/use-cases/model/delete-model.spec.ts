import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../../domain/model/model-consent';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelStorage, ModelStorageError } from '../../domain/model/model-storage';
import type { PartialDownloads } from '../../domain/model/partial-downloads';
import { deleteModel } from './delete-model';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = JAPANESE_OCR_MODEL.modelId;

const REMOVED: ModelStorageReport = {
  modelId: MODEL,
  files: 9,
  bytes: 204_413_485,
  unsized: 0,
  required: REQUIRED_WEIGHTS,
  weights: REQUIRED_WEIGHTS,
};

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

  const partial: PartialReport = { modelId: MODEL, files: 1, bytes: 62_000_000 };

  const partials: PartialDownloads = {
    measure: () => Promise.resolve(ok(partial)),
    discard: (modelId: string) => {
      steps.push(`discard ${modelId}`);
      return Promise.resolve(ok(partial));
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

  return { deps: { storage, partials, consent }, steps, consent, granted };
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

    expect(steps).toEqual([`remove ${MODEL}`, `discard ${MODEL}`, 'forget ja']);
  });

  it('discards the part-downloaded file along with the cached weights', async () => {
    const { deps, steps } = world();
    await deleteModel(deps, 'ja', MODEL);

    expect(steps).toContain(`discard ${MODEL}`);
  });

  it('keeps the grant when nothing could be removed', async () => {
    const { deps, steps } = world({ removal: err({ kind: 'cache-unavailable' }) });
    const removed = await deleteModel(deps, 'ja', MODEL);

    expect(removed.ok).toBe(false);
    expect(steps).toEqual([`remove ${MODEL}`]);
  });
});
