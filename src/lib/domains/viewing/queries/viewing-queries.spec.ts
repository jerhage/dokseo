import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { editBookMutation, saveReadingPlaceMutation } from './viewing-queries';

const BOOK = bookId('one');

const BROKEN = new Error('broken');

const PLACE = imagePlace(imageIndex(3));

describe('editBookMutation', () => {
  it('passes the book and the edit, and resolves a refused edit as an answer', async () => {
    const asked: [BookId, string][] = [];
    const editing = new MutationObserver(
      createTestQueryClient(),
      editBookMutation({
        editBook: (id: BookId, edit: string) => {
          asked.push([id, edit]);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    );

    expect(await editing.mutate({ id: BOOK, edit: 'rtl' })).toEqual(STORAGE_UNAVAILABLE);
    expect(asked).toEqual([[BOOK, 'rtl']]);
  });

  it('rejects with the error a failed edit throws', async () => {
    const editing = new MutationObserver(
      createTestQueryClient(),
      editBookMutation({ editBook: (_id: BookId, _edit: string) => Promise.reject(BROKEN) }),
    );

    await expect(editing.mutate({ id: BOOK, edit: 'rtl' })).rejects.toBe(BROKEN);
  });
});

describe('saveReadingPlaceMutation', () => {
  it('passes the book and the place, and resolves a refused save as an answer', async () => {
    const asked: [BookId, ReadingPlace][] = [];
    const placing = new MutationObserver(
      createTestQueryClient(),
      saveReadingPlaceMutation({
        saveReadingPlace: (id, place) => {
          asked.push([id, place]);
          return Promise.resolve(STORAGE_UNAVAILABLE);
        },
      }),
    );

    expect(await placing.mutate({ id: BOOK, place: PLACE })).toEqual(STORAGE_UNAVAILABLE);
    expect(asked).toEqual([[BOOK, PLACE]]);
  });

  it('rejects with the error a failed save throws', async () => {
    const placing = new MutationObserver(
      createTestQueryClient(),
      saveReadingPlaceMutation({ saveReadingPlace: () => Promise.reject(BROKEN) }),
    );

    await expect(placing.mutate({ id: BOOK, place: PLACE })).rejects.toBe(BROKEN);
  });
});
