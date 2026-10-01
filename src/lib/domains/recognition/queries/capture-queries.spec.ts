import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { QueryFailure } from '$lib/shared/query-failure';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Capture } from '../domain/capture/capture';
import { everyCaptureQuery } from './capture-queries';
import { recognitionKeys } from './recognition-keys';
import { describeStoreFailure, storedState } from './store-read';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';

const CAPTURE: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 10, 10) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

describe('everyCaptureQuery', () => {
  it('resolves every capture in the library', async () => {
    const read = everyCaptureQuery({ listEveryCapture: () => Promise.resolve(ok([CAPTURE])) });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'read',
      value: [CAPTURE],
    });
  });

  it('resolves a store the browser blocks as an answer', async () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve(err({ kind: 'storage-unavailable' })),
    });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'storage-unavailable',
    });
  });

  it('rejects a store that failed with the described note', async () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve(err({ kind: 'storage-failed', cause: 'locked' })),
    });

    const failure = await createTestQueryClient()
      .fetchQuery(read)
      .catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(QueryFailure);
    expect(failure).toHaveProperty('message', 'Local storage failed: locked');
    expect(failure).toHaveProperty('cause', { kind: 'storage-failed', cause: 'locked' });
  });

  it('files the read under the recognition root, stale at once', () => {
    const read = everyCaptureQuery({ listEveryCapture: () => Promise.resolve(ok([])) });

    expect(read.queryKey).toEqual(recognitionKeys.everyCapture());
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });
});

describe('describeStoreFailure', () => {
  it('says the browser blocks local storage', () => {
    expect(describeStoreFailure({ kind: 'storage-unavailable' })).toBe(
      'This browser blocks local storage.',
    );
  });

  it('names the cause of a failed store', () => {
    expect(describeStoreFailure({ kind: 'storage-failed', cause: 'quota' })).toBe(
      'Local storage failed: quota',
    );
  });
});

describe('storedState', () => {
  it('passes a load and a failure through', () => {
    expect(storedState(LOADING)).toEqual(LOADING);
    expect(storedState(readFailed('broke'))).toEqual(readFailed('broke'));
  });

  it('readies what was read', () => {
    expect(storedState(readReady({ kind: 'read', value: [CAPTURE] }))).toEqual(
      readReady([CAPTURE]),
    );
  });

  it('fails a blocked store with the note the read showed before', () => {
    expect(storedState(readReady({ kind: 'storage-unavailable' }))).toEqual(
      readFailed('This browser blocks local storage.'),
    );
  });
});
