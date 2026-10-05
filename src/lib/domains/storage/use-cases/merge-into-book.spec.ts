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
import { mergeIntoBook } from './merge-into-book';
import type { MergeIntoBookDeps } from './merge-into-book';

const WRITTEN: LibraryWrite = { kind: 'success' };

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Outcomes = {
  readonly moving?: (from: string) => CaptureWrite;
  readonly erasing?: LibraryWrite;
};

function captureRepository(moveBook: CaptureRepository['moveBook']): CaptureRepository {
  return {
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    untagEverywhere: notUsed,
    moveBook,
  };
}

function libraryRepository(
  writes: Pick<LibraryRepository, 'remove' | 'forgetRemoved' | 'erase'>,
): LibraryRepository {
  return {
    list: notUsed,
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    listRemoved: notUsed,
    listRestorable: notUsed,
    addRemoved: () => Promise.reject(new Error('not used')),
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
    ...writes,
  };
}

function world(outcomes: Outcomes = {}) {
  const steps: string[] = [];
  const captures = captureRepository((from, to) => {
    steps.push(`moved ${from} to ${to}`);
    return Promise.resolve(outcomes.moving?.(from) ?? WRITTEN);
  });
  const repository = libraryRepository({
    remove: notUsed,
    forgetRemoved: notUsed,
    erase: (id) => {
      steps.push(`erased ${id}`);
      return Promise.resolve(outcomes.erasing ?? WRITTEN);
    },
  });
  const deps: MergeIntoBookDeps = {
    moving: { captures },
    erasing: { repository },
  };
  return { deps, steps };
}

type Stop = 'refused' | 'thrown';

type Place = 'shelf' | 'removed' | 'gone';

const HELD = bookId('6a7bd926-held');

const BROKEN = bookId('a816bb74-9c83-4e11-a8bf-ce63119b9e24');

function storedOrigin(stopAt: number, stop: Stop) {
  const shelf = new Set<BookId>([HELD, BROKEN]);
  const removed = new Set<BookId>();
  const captures = new Map<string, BookId>([
    ['capture-1', BROKEN],
    ['capture-2', BROKEN],
    ['capture-3', HELD],
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

  const repository = libraryRepository({
    remove: (id) =>
      write(() => {
        if (shelf.delete(id)) removed.add(id);
      }),
    forgetRemoved: (id) => write(() => removed.delete(id)),
    erase: (id) =>
      write(() => {
        shelf.delete(id);
        removed.delete(id);
      }),
  });
  const deps: MergeIntoBookDeps = {
    moving: {
      captures: captureRepository((from, to) =>
        write(() => {
          for (const [capture, book] of captures) if (book === from) captures.set(capture, to);
        }),
      ),
    },
    erasing: { repository },
  };

  return {
    deps,
    placeOf: (id: BookId): Place => {
      if (shelf.has(id)) return 'shelf';
      return removed.has(id) ? 'removed' : 'gone';
    },
    unreachableCaptures: () =>
      [...captures.values()].filter((book) => !shelf.has(book) && !removed.has(book)).length,
    capturesOf: (id: BookId) => [...captures.values()].filter((book) => book === id).length,
    resume: () => {
      stopping = false;
    },
  };
}

describe('mergeIntoBook', () => {
  it('moves the captures onto the held book before it erases the unreadable row', async () => {
    const origin = world();

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual({ kind: 'merged' });
    expect(origin.steps).toEqual([`moved ${BROKEN} to ${HELD}`, `erased ${BROKEN}`]);
  });

  it('merges each unreadable row in turn', async () => {
    const origin = world();

    await mergeIntoBook(origin.deps, HELD, [bookId('broken-1'), bookId('broken-2')]);

    expect(origin.steps.filter((step) => step.startsWith('moved'))).toEqual([
      `moved broken-1 to ${HELD}`,
      `moved broken-2 to ${HELD}`,
    ]);
  });

  it('touches no row when the captures cannot be moved', async () => {
    const origin = world({ moving: () => STORAGE_UNAVAILABLE });

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(origin.steps).toEqual([`moved ${BROKEN} to ${HELD}`]);
  });

  it('reports a partial merge and leaves the unreadable row when it cannot be erased', async () => {
    const origin = world({ erasing: STORAGE_UNAVAILABLE });

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual({ kind: 'partly-merged' });
    expect(origin.steps).toEqual([`moved ${BROKEN} to ${HELD}`, `erased ${BROKEN}`]);
  });

  it('reports a partial merge when a later row cannot be moved after an earlier one merged', async () => {
    const origin = world({
      moving: (from) => (from === 'broken-2' ? STORAGE_UNAVAILABLE : WRITTEN),
    });

    const result = await mergeIntoBook(origin.deps, HELD, [bookId('broken-1'), bookId('broken-2')]);

    expect(result).toEqual({ kind: 'partly-merged' });
  });
});

describe('a merge stopped part way', () => {
  it.each([
    [1, 'refused'],
    [2, 'refused'],
    [3, 'refused'],
    [1, 'thrown'],
    [2, 'thrown'],
    [3, 'thrown'],
  ] as const)(
    'leaves the unreadable row on the shelf, where Merge finishes it, when write %i is %s',
    async (stopAt, stop) => {
      const origin = storedOrigin(stopAt, stop);

      await mergeIntoBook(origin.deps, HELD, [BROKEN]).catch(() => undefined);

      expect(origin.placeOf(BROKEN)).not.toBe('removed');
      expect(origin.unreachableCaptures()).toBe(0);

      origin.resume();
      const again = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

      expect(again).toEqual({ kind: 'merged' });
      expect(origin.placeOf(BROKEN)).toBe('gone');
      expect(origin.capturesOf(HELD)).toBe(3);
    },
  );
});
