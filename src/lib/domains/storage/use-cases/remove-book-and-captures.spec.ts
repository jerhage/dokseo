import { describe, expect, it } from 'vitest';
import type {
  LibraryRepository,
  LibraryWrite,
} from '$lib/domains/library/domain/book/library-repository';
import type {
  CaptureRepository,
  CaptureWrite,
} from '$lib/domains/recognition/domain/capture/capture-repository';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { deleteRemovedBookCaptures } from './delete-removed-book-captures';
import type { DeleteRemovedBookCapturesDeps } from './delete-removed-book-captures';
import { removeBookAndCaptures } from './remove-book-and-captures';
import type { RemoveBookAndCapturesDeps } from './remove-book-and-captures';

const WRITTEN: LibraryWrite = { kind: 'success' };

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Outcomes = {
  readonly removing?: LibraryWrite;
  readonly clearing?: CaptureWrite;
  readonly forgetting?: LibraryWrite;
};

function world(outcomes: Outcomes = {}) {
  const steps: string[] = [];
  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
    clearBook: (book) => {
      steps.push(`cleared ${book}`);
      return Promise.resolve(outcomes.clearing ?? WRITTEN);
    },
  };
  const repository: LibraryRepository = {
    list: notUsed,
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: (id) => {
      steps.push(`removed ${id}`);
      return Promise.resolve(outcomes.removing ?? WRITTEN);
    },
    listRemoved: notUsed,
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    replaceFile: notUsed,
    forgetRemoved: (id) => {
      steps.push(`forgot ${id}`);
      return Promise.resolve(outcomes.forgetting ?? WRITTEN);
    },
    erase: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const deps: RemoveBookAndCapturesDeps = {
    removing: { repository, now: () => 1 },
    clearing: { captures },
    forgetting: { repository },
  };
  return { deps, steps };
}

describe('removeBookAndCaptures', () => {
  it('removes the book, deletes its captures by book id, and keeps no removed record', async () => {
    const origin = world();

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual({ kind: 'success' });
    expect(origin.steps).toEqual(['removed book-1', 'cleared book-1', 'forgot book-1']);
  });

  it('touches no capture when the book cannot be removed', async () => {
    const origin = world({ removing: STORAGE_UNAVAILABLE });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(origin.steps).toEqual(['removed book-1']);
  });

  it('reports a partial removal and keeps the record when the captures cannot be deleted', async () => {
    const origin = world({ clearing: STORAGE_UNAVAILABLE });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual({ kind: 'partly-removed' });
    expect(origin.steps).toEqual(['removed book-1', 'cleared book-1']);
  });

  it('reports a partial removal when the record cannot be forgotten', async () => {
    const origin = world({ forgetting: STORAGE_UNAVAILABLE });

    const result = await removeBookAndCaptures(origin.deps, bookId('book-1'));

    expect(result).toEqual({ kind: 'partly-removed' });
  });
});

type Stop = 'refused' | 'thrown';

type Place = 'shelf' | 'removed' | 'gone';

const BOOK = bookId('book-1');

function storedOrigin(stopAt: number, stop: Stop) {
  const shelf = new Set<BookId>([BOOK]);
  const removed = new Set<BookId>();
  const captures = new Map<string, BookId>([
    ['capture-1', BOOK],
    ['capture-2', BOOK],
  ]);
  let writes = 0;
  let stopping = true;

  const write = (apply: () => void): Promise<LibraryWrite> => {
    writes += 1;
    if (stopping && writes === stopAt) {
      return stop === 'refused'
        ? Promise.resolve(STORAGE_UNAVAILABLE)
        : Promise.reject(new Error('the tab closed'));
    }
    apply();
    return Promise.resolve(WRITTEN);
  };

  const captureRepository: CaptureRepository = {
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
    clearBook: (book) =>
      write(() => {
        for (const [capture, owner] of captures) if (owner === book) captures.delete(capture);
      }),
  };
  const repository: LibraryRepository = {
    list: notUsed,
    get: notUsed,
    add: notUsed,
    replaceFile: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: (id) =>
      write(() => {
        if (shelf.delete(id)) removed.add(id);
      }),
    listRemoved: notUsed,
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: (id) => write(() => removed.delete(id)),
    erase: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const removing: RemoveBookAndCapturesDeps = {
    removing: { repository, now: () => 1 },
    clearing: { captures: captureRepository },
    forgetting: { repository },
  };
  const deleting: DeleteRemovedBookCapturesDeps = {
    clearing: { captures: captureRepository },
    forgetting: { repository },
  };

  return {
    removing,
    deleting,
    placeOf: (id: BookId): Place => {
      if (shelf.has(id)) return 'shelf';
      return removed.has(id) ? 'removed' : 'gone';
    },
    unreachableCaptures: () =>
      [...captures.values()].filter((book) => !shelf.has(book) && !removed.has(book)).length,
    captureCount: () => captures.size,
    resume: () => {
      stopping = false;
    },
  };
}

describe('a removal with captures stopped part way', () => {
  it.each([
    [1, 'refused'],
    [2, 'refused'],
    [3, 'refused'],
    [1, 'thrown'],
    [2, 'thrown'],
    [3, 'thrown'],
  ] as const)(
    'leaves the book on the shelf or under Removed books, where one more action finishes it, when write %i is %s',
    async (stopAt, stop) => {
      const origin = storedOrigin(stopAt, stop);

      await removeBookAndCaptures(origin.removing, BOOK).catch(() => undefined);

      expect(origin.placeOf(BOOK)).not.toBe('gone');
      expect(origin.unreachableCaptures()).toBe(0);

      origin.resume();
      const finished =
        origin.placeOf(BOOK) === 'shelf'
          ? await removeBookAndCaptures(origin.removing, BOOK)
          : await deleteRemovedBookCaptures(origin.deleting, BOOK);

      expect(finished).toEqual({ kind: 'success' });
      expect(origin.placeOf(BOOK)).toBe('gone');
      expect(origin.captureCount()).toBe(0);
    },
  );
});
