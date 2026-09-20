import { describe, expect, it } from 'vitest';
import { bookId, type BookId } from '$lib/shared/ids';
import { err, ok, type Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';
import { removeBook } from './remove-book';

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

function fakeRepository(outcome: Result<void, LibraryError>) {
  const removed: BookId[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve(ok([])),
    get: (id) => Promise.resolve(notFound(id)),
    add: () => Promise.resolve(ok(undefined)),
    remove: (id) => {
      removed.push(id);
      return Promise.resolve(outcome);
    },
    update: (id) => Promise.resolve(notFound(id)),
    readSource: (id) => Promise.resolve(notFound(id)),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };
  return { repository, removed };
}

describe('removeBook', () => {
  it('passes the id to the repository and returns what the repository returned', async () => {
    const outcome = err<LibraryError>({ kind: 'storage-failed', cause: 'the disk went away' });
    const repository = fakeRepository(outcome);
    const result = await removeBook({ repository: repository.repository }, bookId('book-7'));
    expect(repository.removed).toEqual(['book-7']);
    expect(result).toEqual(outcome);
  });
});
