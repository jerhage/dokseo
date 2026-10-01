import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { isModelStored, isResumable, shownStorage } from './model-storage.svelte';

const WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

function snapshot(
  weights: readonly string[],
  files: number,
  partialBytes = 0,
): ModelStorageSnapshot {
  return {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files,
      bytes: 400_000,
      unsized: 0,
      required: WEIGHTS,
      weights,
    },
    partial: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files: partialBytes > 0 ? 1 : 0,
      bytes: partialBytes,
    },
    usage: null,
    quota: null,
    persisted: true,
  };
}

describe('shownStorage', () => {
  it('shows nothing and says nothing while the storage is read', () => {
    expect(shownStorage(LOADING)).toEqual({ snapshot: null, message: null });
  });

  it('shows the failure in place of a snapshot', () => {
    expect(shownStorage(readFailed('The cache could not be read: x'))).toEqual({
      snapshot: null,
      message: 'The cache could not be read: x',
    });
  });

  it('shows what was read with no message', () => {
    const read = snapshot(WEIGHTS, 7);

    expect(shownStorage(readReady({ kind: 'success', snapshot: read }))).toEqual({
      snapshot: read,
      message: null,
    });
  });

  it('shows a browser with no cache as a message', () => {
    expect(shownStorage(readReady({ kind: 'cache-unavailable' }))).toEqual({
      snapshot: null,
      message: 'This browser exposes no cache, so what the model occupies cannot be read.',
    });
  });
});

describe('isModelStored', () => {
  it('counts a model stored only once every weight file is cached', () => {
    expect(isModelStored(snapshot(WEIGHTS, 7))).toBe(true);
    expect(isModelStored(snapshot([WEIGHTS[0] ?? ''], 6))).toBe(false);
    expect(isModelStored(null)).toBe(false);
  });
});

describe('isResumable', () => {
  it('offers no resume for a stored model, even beside a leftover part', () => {
    expect(isResumable(snapshot(WEIGHTS, 7, 5_000_000))).toBe(false);
  });

  it('offers a resume for a part-downloaded file alone', () => {
    expect(isResumable(snapshot([], 0, 5_000_000))).toBe(true);
  });

  it('offers a resume while one of the weight files is still missing', () => {
    expect(isResumable(snapshot([WEIGHTS[0] ?? ''], 6))).toBe(true);
  });

  it('offers no resume when nothing is held or nothing was read', () => {
    expect(isResumable(snapshot([], 0))).toBe(false);
    expect(isResumable(null)).toBe(false);
  });
});
