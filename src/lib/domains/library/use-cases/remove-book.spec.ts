import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type {
  BookLookup,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import { removeBook } from './remove-book';

const WRITTEN: LibraryWrite = { kind: 'success' };

const NO_BOOK: BookLookup = { kind: 'success', book: null };

function fakeRepository(outcome: LibraryWrite) {
  const removed: BookId[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [], unreadable: [] }),
    get: () => Promise.resolve(NO_BOOK),
    add: () => Promise.resolve(WRITTEN),
    remove: (id) => {
      removed.push(id);
      return Promise.resolve(outcome);
    },
    update: () => Promise.resolve(NO_BOOK),
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
    listRemoved: () => Promise.resolve({ kind: 'success', removed: [] }),
    listRestorable: () => Promise.resolve({ kind: 'success', removed: [] }),
    forgetRemoved: () => Promise.resolve({ kind: 'success' }),
  };
  return { repository, removed };
}

describe('removeBook', () => {
  it('passes the id to the repository and returns what the repository returned', async () => {
    const outcome = STORAGE_UNAVAILABLE;
    const repository = fakeRepository(outcome);
    const result = await removeBook({ repository: repository.repository }, bookId('book-7'));
    expect(repository.removed).toEqual(['book-7']);
    expect(result).toEqual(outcome);
  });
});
