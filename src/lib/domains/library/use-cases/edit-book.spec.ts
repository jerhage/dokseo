import { describe, expect, it } from 'vitest';
import { bookId, imageIndex, type BookId } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { editBook } from './edit-book';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

const stored: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
  language: 'ja',
  layoutKind: 'continuous',
  direction: 'ltr',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imageIndex(3),
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

describe('editBook', () => {
  it('passes the id and the edit to the repository and returns what the repository returned', async () => {
    const outcome = ok(stored);
    const repository = fakeRepository(outcome);
    const edit: BookEdit = { title: 'Blame! 1', layoutKind: 'continuous' };
    const result = await editBook({ repository: repository.repository }, bookId('book-7'), edit);
    expect(repository.updates).toEqual([{ id: 'book-7', edit }]);
    expect(result).toEqual(outcome);
  });
});
