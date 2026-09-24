import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { markFinished } from './mark-finished';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

const NOW = 1758400000000;

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

const stored: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(40)),
  lastReadAt: 1758300000000,
  finishedAt: null,
};

function fakeRepository(outcome: Result<Book, LibraryError>) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
    get: (id) => Promise.resolve(notFound(id)),
    add: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
    update: (id, edit) => {
      updates.push({ id, edit });
      return Promise.resolve(outcome);
    },
    readSource: (id) => Promise.resolve(notFound(id)),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };
  return { repository, updates };
}

describe('markFinished', () => {
  it('marks the book finished now and leaves its place and last read time alone', async () => {
    const fake = fakeRepository(ok({ ...stored, finishedAt: NOW }));

    await markFinished({ repository: fake.repository, now: () => NOW }, bookId('book-7'));

    expect(fake.updates).toEqual([{ id: 'book-7', edit: { finishedAt: NOW } }]);
  });

  it('returns what the repository returned', async () => {
    const failed = err({ kind: 'not-found', id: bookId('book-7') } as const);
    const fake = fakeRepository(failed);

    const result = await markFinished(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
    );

    expect(result).toEqual(failed);
  });
});
