import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import type { Language } from '$lib/shared/language';
import { QueryFailure } from '$lib/shared/query-failure';
import { readFailed, readReady, LOADING } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { observedRead } from '$lib/shared/testing/observed-read';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { at } from '$lib/shared/testing/at';
import type { GpuDetection } from '../domain/engine/compute-choice';
import { setupChoice } from '../domain/engine/recognizer-setup';
import { JAPANESE_OCR_MODEL, modelsFor } from '../domain/model/model-footprint';
import type { ReadRecognizerSetupResult } from '../use-cases/engine/read-recognizer-setup';
import type { SaveRecognizerSetupResult } from '../use-cases/engine/save-recognizer-setup';
import type {
  ModelStorageSnapshot,
  ReadModelStorageResult,
} from '../use-cases/model/read-model-storage';
import {
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
  setupState,
} from './engine-queries';
import type { LanguageSetup, LanguageSetupRead, OfferedModels } from './engine-queries';
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

function setupReads(answer: (language: Language) => Promise<ReadRecognizerSetupResult>) {
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

function storageReads(answer: () => Promise<ReadModelStorageResult>) {
  return { readModelStorage: answer };
}

describe('recognizerSetupQuery', () => {
  it('reads the asked language and offers its models with the stored choice', async () => {
    const reads = setupReads((language) =>
      Promise.resolve({
        kind: 'success',
        choice: setupChoice(language, { language, modelId: SECOND.modelId, compute: 'gpu' }),
      }),
    );

    const setup = await observedRead(
      createTestQueryClient(),
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    expect(reads.asked).toEqual(['ja']);
    expect(setup).toEqual(
      readReady({
        kind: 'success',
        setup: { language: 'ja', models: JAPANESE, selected: SECOND.modelId, compute: 'gpu' },
      }),
    );
    expect(
      setup.kind === 'ready' && setup.value.kind === 'success' && at(setup.value.setup.models, 1),
    ).toBe(SECOND);
  });

  it('reads the language it is given', async () => {
    const reads = setupReads((language) =>
      Promise.resolve({ kind: 'success', choice: setupChoice(language, null) }),
    );

    const setup = await observedRead(
      createTestQueryClient(),
      recognizerSetupQuery(reads.recognition, 'ko'),
    );

    expect(reads.asked).toEqual(['ko']);
    expect(
      setup.kind === 'ready' && setup.value.kind === 'success' && setup.value.setup.language,
    ).toBe('ko');
  });

  it('readies a blocked store as an answer, and offers no default', async () => {
    const reads = setupReads(() => Promise.resolve(STORAGE_UNAVAILABLE));

    const setup = await observedRead(
      createTestQueryClient(),
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    expect(setup).toEqual(readReady(STORAGE_UNAVAILABLE));
  });

  it('fails a read that threw with its cause under a lead-in', async () => {
    const reads = setupReads(() => Promise.reject(new Error('blocked')));

    const setup = await observedRead(
      createTestQueryClient(),
      recognizerSetupQuery(reads.recognition, 'ja'),
    );

    expect(setup).toEqual(readFailed('The engine choice could not be read: blocked'));
  });

  it('keeps the thrown error as the failure cause', async () => {
    const thrown = new Error('blocked');
    const reads = setupReads(() => Promise.reject(thrown));

    const client = createTestQueryClient();
    const options = recognizerSetupQuery(reads.recognition, 'ja');

    await observedRead(client, options);

    const failure = client.getQueryState(options.queryKey)?.error;
    expect(failure).toBeInstanceOf(QueryFailure);
    expect(failure).toHaveProperty('cause', thrown);
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
  it('readies the detection and keeps it for the session', async () => {
    let probes = 0;
    const client = createTestQueryClient();
    const options = computeQuery({
      detectCompute: () => {
        probes += 1;
        return Promise.resolve(DETECTED);
      },
    });

    const first = await observedRead(client, options);
    await observedRead(client, options);

    expect(first).toEqual(readReady(DETECTED));
    expect(probes).toBe(1);
    expect(options.queryKey).toEqual(['recognition', 'compute']);
  });

  it('fails a probe that threw with its cause', async () => {
    const detected = await observedRead(
      createTestQueryClient(),
      computeQuery({ detectCompute: () => Promise.reject(new Error('lost')) }),
    );

    expect(detected).toEqual(readFailed('lost'));
  });
});

describe('modelStorageQuery', () => {
  it('readies what the model occupies', async () => {
    const read = await observedRead(
      createTestQueryClient(),
      modelStorageQuery(
        storageReads(() => Promise.resolve({ kind: 'success', snapshot: SNAPSHOT })),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    expect(read).toEqual(readReady({ kind: 'success', snapshot: SNAPSHOT }));
  });

  it('readies a browser with no cache as an answer', async () => {
    const read = await observedRead(
      createTestQueryClient(),
      modelStorageQuery(
        storageReads(() => Promise.resolve({ kind: 'cache-unavailable' })),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    expect(read).toEqual(readReady({ kind: 'cache-unavailable' }));
  });

  it('names the cause of a read that threw', async () => {
    const read = await observedRead(
      createTestQueryClient(),
      modelStorageQuery(
        storageReads(() => Promise.reject(new Error('gone'))),
        JAPANESE_OCR_MODEL.modelId,
      ),
    );

    expect(read).toEqual(readFailed('What the model occupies could not be read: gone'));
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

const SETUP: LanguageSetup = {
  language: 'ja',
  models: offeredModels('ja') as OfferedModels,
  selected: null,
  compute: 'gpu',
};

describe('setupState', () => {
  const HELD: LanguageSetupRead = { kind: 'success', setup: SETUP };

  it('passes a load and a failure through', () => {
    expect(setupState(LOADING)).toEqual(LOADING);
    expect(setupState(readFailed('broke'))).toEqual(readFailed('broke'));
  });

  it('readies the setup that was read', () => {
    expect(setupState(readReady(HELD))).toEqual(readReady(SETUP));
  });

  it('fails a blocked store with the note the screen showed before', () => {
    expect(setupState(readReady(STORAGE_UNAVAILABLE))).toEqual(
      readFailed('This browser blocks local storage, so the engine choice cannot be read.'),
    );
  });
});

function setupWrites(saving: SaveRecognizerSetupResult) {
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
    const { steps, recognition } = setupWrites({ kind: 'success' });
    const saving = new MutationObserver(createTestQueryClient(), saveSetupMutation(recognition));

    await saving.mutate({ setup: SETUP, modelId: SECOND.modelId, abandoned: null });

    expect(steps).toEqual([`save ja ${SECOND.modelId} gpu`, 'pause ja', 'close ja']);
  });

  it('cancels the abandoned model in place of a pause', async () => {
    const { steps, recognition } = setupWrites({ kind: 'success' });
    const saving = new MutationObserver(createTestQueryClient(), saveSetupMutation(recognition));

    await saving.mutate({ setup: SETUP, modelId: SECOND.modelId, abandoned: 'old-model' });

    expect(steps).toEqual([`save ja ${SECOND.modelId} gpu`, 'cancel ja old-model', 'close ja']);
  });

  it('answers a refused save as data, after closing the recognizer all the same', async () => {
    const refused = STORAGE_UNAVAILABLE;
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
          return Promise.resolve({ kind: 'success' });
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
          return Promise.resolve({ kind: 'cancelled' });
        },
      }),
    );

    await expect(
      preparing.mutate({ language: 'ja', onProgress: (load) => reported.push(load.fraction) }),
    ).resolves.toEqual({ kind: 'cancelled' });
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
    const refused = { kind: 'cache-unavailable' } as const;
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
