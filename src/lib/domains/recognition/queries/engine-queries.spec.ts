import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { QueryFailure } from '$lib/shared/query-failure';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { at } from '$lib/shared/testing/at';
import type { GpuDetection } from '../domain/engine/compute-choice';
import { setupChoice } from '../domain/engine/recognizer-setup';
import type { RecognizerChoice, SetupError } from '../domain/engine/recognizer-setup';
import { JAPANESE_OCR_MODEL, modelsFor } from '../domain/model/model-footprint';
import type { ModelStorageError } from '../domain/model/model-storage';
import type { ModelStorageSnapshot } from '../use-cases/model/read-model-storage';
import {
  NO_MODEL,
  cancelDownloadMutation,
  computeQuery,
  deleteModelMutation,
  grantConsentMutation,
  modelStorageQuery,
  offeredModels,
  pauseDownloadMutation,
  prepareRecognizerMutation,
  recognizerSetupQuery,
  saveSetupMutation,
  setupReadNote,
  storageFailureNote,
} from './engine-queries';
import type { LanguageSetup, OfferedModels } from './engine-queries';
import { recognitionKeys } from './recognition-keys';

const DETECTED: GpuDetection = { available: true, description: 'Test GPU' };

const JAPANESE = modelsFor('ja');

const SECOND = at(JAPANESE, 1);

const SNAPSHOT: ModelStorageSnapshot = {
  report: {
    modelId: JAPANESE_OCR_MODEL.modelId,
    files: 7,
    bytes: 400_000,
    unsized: 0,
    required: JAPANESE_OCR_MODEL.weightFiles,
    weights: JAPANESE_OCR_MODEL.weightFiles,
  },
  partial: null,
  usage: null,
  quota: null,
  persisted: true,
};

function setupReads(answer: (language: Language) => Promise<Result<RecognizerChoice, SetupError>>) {
  const asked: Language[] = [];
  return {
    asked,
    recognition: {
      readRecognizerSetup: (language: Language) => {
        asked.push(language);
        return answer(language);
      },
    },
  };
}

function storageReads(answer: () => Promise<Result<ModelStorageSnapshot, ModelStorageError>>) {
  return { readModelStorage: answer };
}

describe('recognizerSetupQuery', () => {
  it('reads the asked language and offers its models with the stored choice', async () => {
    const reads = setupReads((language) =>
      Promise.resolve(
        ok(setupChoice(language, { language, modelId: SECOND.modelId, compute: 'gpu' })),
      ),
    );

    const setup = await createTestQueryClient().fetchQuery(
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    expect(reads.asked).toEqual(['ja']);
    expect(setup).toEqual({
      language: 'ja',
      models: JAPANESE,
      selected: SECOND.modelId,
      compute: 'gpu',
    });
    expect(at(setup.models, 1)).toBe(SECOND);
  });

  it('reads the language it is given', async () => {
    const reads = setupReads((language) => Promise.resolve(ok(setupChoice(language, null))));

    const setup = await createTestQueryClient().fetchQuery(
      recognizerSetupQuery(reads.recognition, 'ko'),
    );

    expect(reads.asked).toEqual(['ko']);
    expect(setup.language).toBe('ko');
  });

  it('rejects a refused read with the note, and offers no default', async () => {
    const reads = setupReads(() =>
      Promise.resolve(err({ kind: 'storage-failed', cause: 'locked' })),
    );

    const fetched = createTestQueryClient().fetchQuery(
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('Local storage failed: locked');
  });

  it('rejects a read that threw with its cause alone', async () => {
    const reads = setupReads(() => Promise.reject(new Error('blocked')));

    const fetched = createTestQueryClient().fetchQuery(
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow(/^blocked$/u);
  });

  it('rejects without reading when no language is asked', async () => {
    const reads = setupReads(() => Promise.resolve(ok(setupChoice('ja', null))));

    const fetched = createTestQueryClient().fetchQuery(
      recognizerSetupQuery(reads.recognition, null),
    );

    await expect(fetched).rejects.toThrow(NO_MODEL);
    expect(reads.asked).toEqual([]);
  });

  it('files each language under its own setup key', () => {
    const reads = setupReads(() => new Promise(() => {}));

    expect(recognizerSetupQuery(reads.recognition, 'ko').queryKey).toEqual(
      recognitionKeys.setup('ko'),
    );
    expect(recognitionKeys.setup('ko')).toEqual(['recognition', 'setup', 'ko']);
  });

  it('counts the setup stale at once', () => {
    const reads = setupReads(() => new Promise(() => {}));

    expect(recognizerSetupQuery(reads.recognition, 'ja').staleTime).toBe(0);
  });
});

describe('computeQuery', () => {
  it('resolves the detection and keeps it for the session', async () => {
    let probes = 0;
    const client = createTestQueryClient();
    const options = computeQuery({
      detectCompute: () => {
        probes += 1;
        return Promise.resolve(DETECTED);
      },
    });

    const first = await client.fetchQuery(options);
    await client.fetchQuery(options);

    expect(first).toBe(DETECTED);
    expect(probes).toBe(1);
    expect(options.queryKey).toEqual(['recognition', 'compute']);
  });

  it('rejects a probe that threw with its cause', async () => {
    const fetched = createTestQueryClient().fetchQuery(
      computeQuery({ detectCompute: () => Promise.reject(new Error('lost')) }),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow(/^lost$/u);
  });
});

describe('modelStorageQuery', () => {
  it('resolves what the model occupies', async () => {
    const read = await createTestQueryClient().fetchQuery(
      modelStorageQuery(
        storageReads(() => Promise.resolve(ok(SNAPSHOT))),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    expect(read).toBe(SNAPSHOT);
  });

  it('rejects a refused read with the described note', async () => {
    const fetched = createTestQueryClient().fetchQuery(
      modelStorageQuery(
        storageReads(() => Promise.resolve(err({ kind: 'cache-failed', cause: 'locked' }))),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('The cache could not be read: locked');
  });

  it('names the cause of a read that threw', async () => {
    const fetched = createTestQueryClient().fetchQuery(
      modelStorageQuery(
        storageReads(() => Promise.reject(new Error('gone'))),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    await expect(fetched).rejects.toThrow('What the model occupies could not be read: gone');
  });

  it('files each model under its own key below the recognition root', () => {
    const { queryKey, staleTime } = modelStorageQuery(
      storageReads(() => new Promise(() => {})),
      'some/model',
    );

    expect(queryKey).toEqual(['recognition', 'model-storage', 'some/model']);
    expect(queryKey.slice(0, recognitionKeys.all().length)).toEqual(recognitionKeys.all());
    expect(staleTime).toBe(0);
  });
});

describe('offeredModels', () => {
  it('offers every model that reads the language', () => {
    expect(offeredModels('ja')).toEqual(JAPANESE);
  });
});

describe('setupReadNote', () => {
  it('says the browser blocks storage', () => {
    expect(setupReadNote({ kind: 'storage-unavailable' })).toContain('blocks local storage');
  });

  it('names the cause of a failed read', () => {
    expect(setupReadNote({ kind: 'storage-failed', cause: 'locked' })).toBe(
      'Local storage failed: locked',
    );
  });
});

describe('storageFailureNote', () => {
  it('names the cause when the cache could be opened but not read', () => {
    expect(storageFailureNote({ kind: 'cache-failed', cause: 'quota exceeded' })).toContain(
      'quota exceeded',
    );
  });

  it('says the browser exposes no cache at all', () => {
    expect(storageFailureNote({ kind: 'cache-unavailable' })).toContain('no cache');
  });
});

const SETUP: LanguageSetup = {
  language: 'ja',
  models: offeredModels('ja') as OfferedModels,
  selected: null,
  compute: 'gpu',
};

function setupWrites(saving: Result<void, SetupError>) {
  const steps: string[] = [];
  return {
    steps,
    recognition: {
      saveRecognizerSetup: (language: Language, setup: { modelId: string; compute: string }) => {
        steps.push(`save ${language} ${setup.modelId} ${setup.compute}`);
        return Promise.resolve(saving);
      },
      pauseModelLoad: (language: Language) => {
        steps.push(`pause ${language}`);
        return Promise.resolve();
      },
      cancelModelLoad: (language: Language, modelId: string) => {
        steps.push(`cancel ${language} ${modelId}`);
        return Promise.resolve(null);
      },
      closeRecognizer: (language: Language) => {
        steps.push(`close ${language}`);
        return Promise.resolve();
      },
    },
  };
}

describe('saveSetupMutation', () => {
  it('saves the model and compute, pauses the load, then closes the recognizer', async () => {
    const { steps, recognition } = setupWrites(ok(undefined));
    const saving = new MutationObserver(createTestQueryClient(), saveSetupMutation(recognition));

    await saving.mutate({ setup: SETUP, modelId: SECOND.modelId, abandoned: null });

    expect(steps).toEqual([`save ja ${SECOND.modelId} gpu`, 'pause ja', 'close ja']);
  });

  it('cancels the abandoned model in place of a pause', async () => {
    const { steps, recognition } = setupWrites(ok(undefined));
    const saving = new MutationObserver(createTestQueryClient(), saveSetupMutation(recognition));

    await saving.mutate({ setup: SETUP, modelId: SECOND.modelId, abandoned: 'old-model' });

    expect(steps).toEqual([`save ja ${SECOND.modelId} gpu`, 'cancel ja old-model', 'close ja']);
  });

  it('answers a refused save as data, after closing the recognizer all the same', async () => {
    const refused = err({ kind: 'storage-unavailable' } as const);
    const { steps, recognition } = setupWrites(refused);
    const saving = new MutationObserver(createTestQueryClient(), saveSetupMutation(recognition));

    await expect(
      saving.mutate({ setup: SETUP, modelId: SECOND.modelId, abandoned: null }),
    ).resolves.toEqual(refused);
    expect(steps.at(-1)).toBe('close ja');
  });
});

describe('download mutations', () => {
  it('grants the consent of the language it is given', async () => {
    const granted: Language[] = [];
    const granting = new MutationObserver(
      createTestQueryClient(),
      grantConsentMutation({
        grantModelConsent: (language) => {
          granted.push(language);
          return Promise.resolve(ok(undefined));
        },
      }),
    );

    await granting.mutate('ko');

    expect(granted).toEqual(['ko']);
  });

  it('prepares the recognizer with the progress callback it is given', async () => {
    const reported: number[] = [];
    const preparing = new MutationObserver(
      createTestQueryClient(),
      prepareRecognizerMutation({
        prepareRecognizer: (_language, notices) => {
          notices?.onProgress?.({
            fraction: 0.5,
            source: 'network',
            loadedBytes: 1,
            totalBytes: 2,
          });
          return Promise.resolve(err({ kind: 'cancelled' }));
        },
      }),
    );

    await expect(
      preparing.mutate({ language: 'ja', onProgress: (load) => reported.push(load.fraction) }),
    ).resolves.toEqual(err({ kind: 'cancelled' }));
    expect(reported).toEqual([0.5]);
  });

  it('pauses and cancels the load it names', async () => {
    const steps: string[] = [];
    const client = createTestQueryClient();
    const pausing = new MutationObserver(
      client,
      pauseDownloadMutation({
        pauseModelLoad: (language) => {
          steps.push(`pause ${language}`);
          return Promise.resolve();
        },
      }),
    );
    const cancelling = new MutationObserver(
      client,
      cancelDownloadMutation({
        cancelModelLoad: (language, modelId) => {
          steps.push(`cancel ${language} ${modelId}`);
          return Promise.resolve(null);
        },
      }),
    );

    await pausing.mutate('ja');
    await cancelling.mutate({ language: 'ja', modelId: 'model' });

    expect(steps).toEqual(['pause ja', 'cancel ja model']);
  });
});

describe('deleteModelMutation', () => {
  it('cancels the load before it deletes, and answers the deletion as data', async () => {
    const steps: string[] = [];
    const refused = err({ kind: 'cache-unavailable' } as const);
    const deleting = new MutationObserver(
      createTestQueryClient(),
      deleteModelMutation({
        cancelModelLoad: (_language, modelId) => {
          steps.push(`cancel ${modelId}`);
          return Promise.resolve(null);
        },
        deleteModel: (_language, modelId) => {
          steps.push(`delete ${modelId}`);
          return Promise.resolve(refused);
        },
      }),
    );

    await expect(deleting.mutate({ language: 'ja', modelId: 'model' })).resolves.toEqual(refused);
    expect(steps).toEqual(['cancel model', 'delete model']);
  });
});

describe('recognitionKeys.modelStorages', () => {
  it('holds every model storage key below it', () => {
    expect(recognitionKeys.modelStorage('model').slice(0, 2)).toEqual(
      recognitionKeys.modelStorages(),
    );
  });
});
