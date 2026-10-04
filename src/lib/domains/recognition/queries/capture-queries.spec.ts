import { MutationObserver, skipToken } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { observedRead } from '$lib/shared/testing/observed-read';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { notedCapture } from '../domain/capture/capture';
import type { Capture, NotableCapture } from '../domain/capture/capture';
import {
  capturesQuery,
  clearCapturesMutation,
  editTextMutation,
  everyCaptureQuery,
  removeCaptureMutation,
  restoreCaptureMutation,
  saveCaptureMutation,
  writeCaptureNoteMutation,
  writeNoteMutation,
} from './capture-queries';
import { recognitionKeys } from './recognition-keys';
import { storedCaptures, storedTags, unreadableTags } from './store-read';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';

const CAPTURE: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: pageRect(0, 0, 0.01, 0.01) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

const READ_CAPTURE: NotableCapture = {
  id: captureId('read'),
  bookId: bookId('one'),
  anchor: CAPTURE.anchor,
  text: '海',
  origin: 'recognized',
  confidence: null,
  note: null,
  createdAt: 2,
  editedAt: null,
  tagIds: [],
};

describe('everyCaptureQuery', () => {
  it('readies every capture in the library', async () => {
    const read = everyCaptureQuery({
      listEveryCapture: () =>
        Promise.resolve({ kind: 'success', captures: [CAPTURE], unreadable: [] }),
    });

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readReady({ kind: 'success', captures: [CAPTURE], unreadable: [] }),
    );
  });

  it('files the read under the recognition root, stale at once', () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve({ kind: 'success', captures: [], unreadable: [] }),
    });

    expect(read.queryKey).toEqual(recognitionKeys.everyCapture());
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });
});

describe('capturesQuery', () => {
  it('readies the captures of the book it names', async () => {
    const asked: string[] = [];
    const read = capturesQuery(
      {
        listCaptures: (book) => {
          asked.push(book);
          return Promise.resolve({ kind: 'success', captures: [CAPTURE], unreadable: [] });
        },
      },
      bookId('one'),
    );

    expect(await observedRead(createTestQueryClient(), read)).toEqual(
      readReady({ kind: 'success', captures: [CAPTURE], unreadable: [] }),
    );
    expect(asked).toEqual(['one']);
  });

  it('files each book under its own key below the recognition root, stale at once', () => {
    const read = capturesQuery(
      { listCaptures: () => Promise.resolve({ kind: 'success', captures: [], unreadable: [] }) },
      bookId('one'),
    );

    expect(read.queryKey).toEqual(recognitionKeys.captures(bookId('one')));
    expect(read.queryKey).not.toEqual(recognitionKeys.captures(bookId('two')));
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });

  it('reads nothing while no book is open', () => {
    const read = capturesQuery(
      { listCaptures: () => Promise.resolve({ kind: 'success', captures: [], unreadable: [] }) },
      null,
    );

    expect(read.queryFn).toBe(skipToken);
  });
});

describe('capture mutations', () => {
  it('hands each use case what the write names', async () => {
    const asked: string[] = [];
    await new MutationObserver(
      createTestQueryClient(),
      saveCaptureMutation({
        saveCapture: (draft) => {
          asked.push(`save ${draft.id} ${draft.text}`);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    ).mutate(CAPTURE);
    await new MutationObserver(
      createTestQueryClient(),
      writeNoteMutation({
        writeNote: (id, book) => {
          asked.push(`note ${id} ${book}`);
          return Promise.resolve({ kind: 'success', capture: CAPTURE });
        },
      }),
    ).mutate({ id: CAPTURE.id, book: CAPTURE.bookId, anchor: CAPTURE.anchor });
    await new MutationObserver(
      createTestQueryClient(),
      editTextMutation({
        editCaptureText: (capture, text) => {
          asked.push(`edit ${capture.id} ${text}`);
          return Promise.resolve({ kind: 'success', capture });
        },
      }),
    ).mutate({ capture: CAPTURE, text: '山' });
    await new MutationObserver(
      createTestQueryClient(),
      writeCaptureNoteMutation({
        writeCaptureNote: (capture, note) => {
          asked.push(`annotate ${capture.id} ${note}`);
          return Promise.resolve({ kind: 'success', capture: notedCapture(capture, note) });
        },
      }),
    ).mutate({ capture: READ_CAPTURE, note: 'sea' });
    await new MutationObserver(
      createTestQueryClient(),
      removeCaptureMutation({
        removeCapture: (id) => {
          asked.push(`remove ${id}`);
          return Promise.resolve({ kind: 'success' });
        },
      }),
    ).mutate(CAPTURE);
    await new MutationObserver(
      createTestQueryClient(),
      restoreCaptureMutation({
        restoreCapture: (capture) => {
          asked.push(`restore ${capture.id} ${capture.text}`);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    ).mutate(CAPTURE);
    await new MutationObserver(
      createTestQueryClient(),
      clearCapturesMutation({
        clearCaptures: (book) => {
          asked.push(`clear ${book}`);
          return Promise.resolve({ kind: 'success' });
        },
      }),
    ).mutate(CAPTURE.bookId);

    expect(asked).toEqual([
      'save a 海',
      'note a one',
      'edit a 山',
      'annotate read sea',
      'remove a',
      'restore a 海',
      'clear one',
    ]);
  });
});

describe('storedCaptures', () => {
  it.each([
    { state: LOADING, expected: LOADING },
    { state: readFailed('broke'), expected: readFailed('broke') },
    {
      state: readReady({ kind: 'success' as const, captures: [CAPTURE], unreadable: [] }),
      expected: readReady([CAPTURE]),
    },
    {
      state: readReady(STORAGE_UNAVAILABLE),
      expected: readFailed('This browser blocks local storage.'),
    },
  ] as const)(
    'passes a load and a failure through, readies what was read, and fails a blocked store with the note the read showed before (%#)',
    ({ state, expected }) => {
      expect(storedCaptures(state)).toEqual(expected);
    },
  );
});

describe('storedTags', () => {
  it.each([
    { state: LOADING, expected: LOADING },
    { state: readFailed('broke'), expected: readFailed('broke') },
    {
      state: readReady({ kind: 'success' as const, tags: [], unreadable: [] }),
      expected: readReady([]),
    },
    {
      state: readReady(STORAGE_UNAVAILABLE),
      expected: readFailed('This browser blocks local storage.'),
    },
  ] as const)(
    'passes a load and a failure through, readies what was read, and fails a blocked store with the note the read showed before (%#)',
    ({ state, expected }) => {
      expect(storedTags(state)).toEqual(expected);
    },
  );
});

describe('unreadableTags', () => {
  const NAMELESS = { id: tagId('nameless'), name: null };

  it.each([
    { state: LOADING, expected: [] },
    { state: readFailed('broke'), expected: [] },
    { state: readReady(STORAGE_UNAVAILABLE), expected: [] },
    {
      state: readReady({ kind: 'success' as const, tags: [], unreadable: [NAMELESS] }),
      expected: [NAMELESS],
    },
  ] as const)(
    'reports the unreadable tags only of a read that succeeded (%#)',
    ({ state, expected }) => {
      expect(unreadableTags(state)).toEqual(expected);
    },
  );
});
