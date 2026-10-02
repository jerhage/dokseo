import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import type { ModelConsentStore } from '../../domain/model/model-consent';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelCacheRead, ModelStorage } from '../../domain/model/model-storage';
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

const REMOVED_READ: ModelCacheRead = { kind: 'success', report: REMOVED };

function world(options: { readonly removal?: ModelCacheRead } = {}) {
  const steps: string[] = [];

  const storage: ModelStorage = {
    measure: () => Promise.resolve(REMOVED_READ),
    remove: (modelId: string) => {
      steps.push(`remove ${modelId}`);
      return Promise.resolve(options.removal ?? REMOVED_READ);
    },
  };

  const partial: PartialReport = { modelId: MODEL, files: 1, bytes: 62_000_000 };

  const partials: PartialDownloads = {
    measure: () => Promise.resolve({ kind: 'success', report: partial }),
    discard: (modelId: string) => {
      steps.push(`discard ${modelId}`);
      return Promise.resolve({ kind: 'success', report: partial });
    },
  };

  const consent: ModelConsentStore = {
    decisionFor: () => Promise.resolve({ kind: 'success', decision: 'granted' }),
    recordGrant: () => Promise.resolve({ kind: 'success' }),
    forgetGrant: (language: Language) => {
      steps.push(`forget ${language}`);
      return Promise.resolve({ kind: 'success' });
    },
  };

  return { deps: { storage, partials, consent }, steps };
}

describe('deleteModel', () => {
  it('reports what the browser actually removed', async () => {
    const { deps } = world();
    const removed = await deleteModel(deps, 'ja', MODEL);

    expect(removed).toEqual({ kind: 'success', report: REMOVED });
  });

  it('frees the space before it withdraws the grant', async () => {
    const { deps, steps } = world();
    await deleteModel(deps, 'ja', MODEL);

    expect(steps).toEqual([`remove ${MODEL}`, `discard ${MODEL}`, 'forget ja']);
  });

  it('keeps the grant when nothing could be removed', async () => {
    const { deps, steps } = world({ removal: { kind: 'cache-unavailable' } });
    const removed = await deleteModel(deps, 'ja', MODEL);

    expect(removed).toEqual({ kind: 'cache-unavailable' });
    expect(steps).toEqual([`remove ${MODEL}`]);
  });
});
