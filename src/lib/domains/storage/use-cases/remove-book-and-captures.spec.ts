import { describe, expect, it } from 'vitest';
import type {
  LibraryRepository,
  LibraryWrite,
} from '$lib/domains/library/domain/book/library-repository';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type {
  CaptureRepository,
  CaptureWrite,
} from '$lib/domains/recognition/domain/capture/capture-repository';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { removeBookAndCaptures } from './remove-book-and-captures';
import type { RemoveBookAndCapturesDeps } from './remove-book-and-captures';

const WRITTEN: LibraryWrite = { kind: 'success' };

const NO_CAPTURES: readonly Capture[] = [];

type Outcomes = {
  readonly clearing?: CaptureWrite;
  readonly removal?: LibraryWrite;
};

type World = {
  readonly deps: RemoveBookAndCapturesDeps;
  readonly steps: readonly string[];
  readonly cleared: readonly BookId[];
  readonly removed: readonly BookId[];
};

function world(outcomes: Outcomes = {}): World {
  const steps: string[] = [];
  const cleared: BookId[] = [];
  const removed: BookId[] = [];

  const captures: CaptureRepository = {
    listForBook: () => Promise.resolve({ kind: 'success', captures: NO_CAPTURES, unreadable: [] }),
    listEverything: () =>
      Promise.resolve({ kind: 'success', captures: NO_CAPTURES, unreadable: [] }),
    save: () => Promise.reject(new Error('not used')),
    remove: () => Promise.reject(new Error('not used')),
    clearBook: (book) => {
      steps.push('cleared');
      cleared.push(book);
      return Promise.resolve(outcomes.clearing ?? WRITTEN);
    },
  };

  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [], unreadable: [] }),
    get: () => Promise.resolve({ kind: 'success', book: null }),
    add: () => Promise.reject(new Error('not used')),
    remove: (id) => {
      steps.push('removed');
      removed.push(id);
      return Promise.resolve(outcomes.removal ?? WRITTEN);
    },
    update: () => Promise.resolve({ kind: 'success', book: null }),
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
  };

  return {
    deps: { clearing: { captures }, removal: { repository } },
    steps,
    cleared,
    removed,
  };
}

describe('removeBookAndCaptures', () => {
  it('clears the captures of the book it removes, before it removes the book', async () => {
    const origin = world();

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(WRITTEN);
    expect(origin.cleared).toEqual(['book-1']);
    expect(origin.removed).toEqual(['book-1']);
    expect(origin.steps).toEqual(['cleared', 'removed']);
  });

  it('keeps the book when its captures cannot be cleared', async () => {
    const origin = world({ clearing: STORAGE_UNAVAILABLE });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(origin.removed).toEqual([]);
  });

  it('passes a blocked store through when the book cannot be removed', async () => {
    const origin = world({ removal: STORAGE_UNAVAILABLE });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(origin.cleared).toEqual(['book-1']);
  });
});
