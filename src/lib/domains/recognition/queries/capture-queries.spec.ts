import { MutationObserver, skipToken } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
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
import { storedCaptures, storedTags } from './store-read';
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
  it('resolves every capture in the library', async () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve({ kind: 'success', captures: [CAPTURE] }),
    });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'success',
      captures: [CAPTURE],
    });
  });

  it('resolves a store the browser blocks as an answer', async () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve(STORAGE_UNAVAILABLE),
    });

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'storage-unavailable',
    });
  });

  it('rejects with the error a failed store throws', async () => {
    const broken = new Error('locked');
    const read = everyCaptureQuery({ listEveryCapture: () => Promise.reject(broken) });

    await expect(createTestQueryClient().fetchQuery(read)).rejects.toBe(broken);
  });

  it('files the read under the recognition root, stale at once', () => {
    const read = everyCaptureQuery({
      listEveryCapture: () => Promise.resolve({ kind: 'success', captures: [] }),
    });

    expect(read.queryKey).toEqual(recognitionKeys.everyCapture());
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });
});

describe('capturesQuery', () => {
  it('resolves the captures of the book it names', async () => {
    const asked: string[] = [];
    const read = capturesQuery(
      {
        listCaptures: (book) => {
          asked.push(book);
          return Promise.resolve({ kind: 'success', captures: [CAPTURE] });
        },
      },
      bookId('one'),
    );

    await expect(createTestQueryClient().fetchQuery(read)).resolves.toEqual({
      kind: 'success',
      captures: [CAPTURE],
    });
    expect(asked).toEqual(['one']);
  });

  it('resolves a store the browser blocks as an answer and rejects a failed store', async () => {
    const blocked = capturesQuery(
      { listCaptures: () => Promise.resolve(STORAGE_UNAVAILABLE) },
      bookId('one'),
    );
    const broken = capturesQuery(
      { listCaptures: () => Promise.reject(new Error('locked')) },
      bookId('one'),
    );

    await expect(createTestQueryClient().fetchQuery(blocked)).resolves.toEqual({
      kind: 'storage-unavailable',
    });
    await expect(createTestQueryClient().fetchQuery(broken)).rejects.toThrow('locked');
  });

  it('files each book under its own key below the recognition root, stale at once', () => {
    const read = capturesQuery(
      { listCaptures: () => Promise.resolve({ kind: 'success', captures: [] }) },
      bookId('one'),
    );

    expect(read.queryKey).toEqual(recognitionKeys.captures(bookId('one')));
    expect(read.queryKey).not.toEqual(recognitionKeys.captures(bookId('two')));
    expect(read.queryKey.slice(0, 1)).toEqual(recognitionKeys.all());
    expect(read.staleTime).toBe(0);
  });

  it('reads nothing while no book is open', () => {
    const read = capturesQuery(
      { listCaptures: () => Promise.resolve({ kind: 'success', captures: [] }) },
      null,
    );

    expect(read.queryFn).toBe(skipToken);
  });
});

describe('capture mutations', () => {
  const REFUSED = STORAGE_UNAVAILABLE;

  it('answers a refused write as data, for every capture write', async () => {
    const refusing = () => Promise.resolve(REFUSED);
    const writes = [
      new MutationObserver(
        createTestQueryClient(),
        saveCaptureMutation({ saveCapture: refusing }),
      ).mutate(CAPTURE),
      new MutationObserver(
        createTestQueryClient(),
        writeNoteMutation({ writeNote: refusing }),
      ).mutate({
        id: CAPTURE.id,
        book: CAPTURE.bookId,
        anchor: CAPTURE.anchor,
      }),
      new MutationObserver(
        createTestQueryClient(),
        editTextMutation({ editCaptureText: refusing }),
      ).mutate({
        capture: CAPTURE,
        text: '山',
      }),
      new MutationObserver(
        createTestQueryClient(),
        writeCaptureNoteMutation({ writeCaptureNote: refusing }),
      ).mutate({
        capture: READ_CAPTURE,
        note: 'n',
      }),
      new MutationObserver(
        createTestQueryClient(),
        removeCaptureMutation({ removeCapture: refusing }),
      ).mutate(CAPTURE),
      new MutationObserver(
        createTestQueryClient(),
        restoreCaptureMutation({ restoreCapture: refusing }),
      ).mutate(CAPTURE),
      new MutationObserver(
        createTestQueryClient(),
        clearCapturesMutation({ clearCaptures: refusing }),
      ).mutate(CAPTURE.bookId),
    ];

    await expect(Promise.all(writes)).resolves.toEqual(Array.from({ length: 7 }, () => REFUSED));
  });

  it('rejects a write that throws', async () => {
    const saving = new MutationObserver(
      createTestQueryClient(),
      saveCaptureMutation({ saveCapture: () => Promise.reject(new Error('the database closed')) }),
    );

    await expect(saving.mutate(CAPTURE)).rejects.toThrow('the database closed');
  });

  it('hands each use case what the write names', async () => {
    const asked: string[] = [];
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
      clearCapturesMutation({
        clearCaptures: (book) => {
          asked.push(`clear ${book}`);
          return Promise.resolve({ kind: 'success' });
        },
      }),
    ).mutate(CAPTURE.bookId);

    expect(asked).toEqual([
      'note a one',
      'edit a 山',
      'annotate read sea',
      'remove a',
      'clear one',
    ]);
  });
});

describe('storedCaptures', () => {
  it('passes a load and a failure through', () => {
    expect(storedCaptures(LOADING)).toEqual(LOADING);
    expect(storedCaptures(readFailed('broke'))).toEqual(readFailed('broke'));
  });

  it('readies the captures that were read', () => {
    expect(storedCaptures(readReady({ kind: 'success', captures: [CAPTURE] }))).toEqual(
      readReady([CAPTURE]),
    );
  });

  it('fails a blocked store with the note the read showed before', () => {
    expect(storedCaptures(readReady(STORAGE_UNAVAILABLE))).toEqual(
      readFailed('This browser blocks local storage.'),
    );
  });
});

describe('storedTags', () => {
  it('passes a load and a failure through', () => {
    expect(storedTags(LOADING)).toEqual(LOADING);
    expect(storedTags(readFailed('broke'))).toEqual(readFailed('broke'));
  });

  it('readies the tags that were read', () => {
    expect(storedTags(readReady({ kind: 'success', tags: [] }))).toEqual(readReady([]));
  });

  it('fails a blocked store with the note the read showed before', () => {
    expect(storedTags(readReady(STORAGE_UNAVAILABLE))).toEqual(
      readFailed('This browser blocks local storage.'),
    );
  });
});
