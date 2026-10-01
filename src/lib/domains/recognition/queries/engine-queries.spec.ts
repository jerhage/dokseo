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
  computeQuery,
  modelStorageQuery,
  offeredModels,
  recognizerSetupQuery,
  setupReadNote,
  storageFailureNote,
} from './engine-queries';
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
