import { describe, expect, it } from 'vitest';
import type { Book } from '../domain/book/book';
import type {
  BookListing,
  LibraryRepository,
  RemovedListing,
} from '../domain/book/library-repository';
import type { RemovedBook } from '../domain/book/removed-book';
import { bookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { listRemovedShelf } from './list-removed-shelf';

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function removedBook(id: string): RemovedBook {
  return {
    id: bookId(id),
    title: `Title ${id}`,
    alias: null,
    seriesId: null,
    volume: null,
    contentHash: '0123456789abcdef0123456789abcdef',
    fileName: `${id}.cbz`,
    language: 'ja',
    direction: 'rtl',
    addedAt: null,
  };
}

function heldBook(id: string): Book {
  return { id: bookId(id) } as Book;
}

type Outcomes = {
  readonly shelf?: BookListing;
  readonly removed?: RemovedListing;
};

function repositoryWith(outcomes: Outcomes): LibraryRepository {
  return {
    list: () => Promise.resolve(outcomes.shelf ?? { kind: 'success', books: [], unreadable: [] }),
    listRemoved: () => Promise.resolve(outcomes.removed ?? { kind: 'success', removed: [] }),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
}

describe('listRemovedShelf', () => {
  it('lists every removed record', async () => {
    const repository = repositoryWith({
      removed: { kind: 'success', removed: [removedBook('gone-1'), removedBook('gone-2')] },
    });

    const result = await listRemovedShelf({ repository });

    expect(result).toEqual({
      kind: 'success',
      books: [removedBook('gone-1'), removedBook('gone-2')],
    });
  });

  it('leaves out a removed record whose id is a book on the shelf again, readable or not', async () => {
    const repository = repositoryWith({
      shelf: {
        kind: 'success',
        books: [heldBook('gone-1')],
        unreadable: [
          { id: bookId('gone-2'), title: null, alias: null, contentHash: '', fileName: '' },
        ],
      },
      removed: {
        kind: 'success',
        removed: [removedBook('gone-1'), removedBook('gone-2'), removedBook('gone-3')],
      },
    });

    const result = await listRemovedShelf({ repository });

    expect(result).toEqual({ kind: 'success', books: [removedBook('gone-3')] });
  });

  it('passes a blocked store through', async () => {
    const shelfBlocked = await listRemovedShelf({
      repository: repositoryWith({ shelf: STORAGE_UNAVAILABLE }),
    });
    const removedBlocked = await listRemovedShelf({
      repository: repositoryWith({ removed: STORAGE_UNAVAILABLE }),
    });

    expect(shelfBlocked).toEqual(STORAGE_UNAVAILABLE);
    expect(removedBlocked).toEqual(STORAGE_UNAVAILABLE);
  });
});
