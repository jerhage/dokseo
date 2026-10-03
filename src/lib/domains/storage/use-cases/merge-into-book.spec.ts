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
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { mergeIntoBook } from './merge-into-book';
import type { MergeIntoBookDeps } from './merge-into-book';

const WRITTEN: LibraryWrite = { kind: 'success' };

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Outcomes = {
  readonly moving?: (from: string) => CaptureWrite;
  readonly removing?: LibraryWrite;
  readonly forgetting?: LibraryWrite;
};

function world(outcomes: Outcomes = {}) {
  const steps: string[] = [];
  const captures: CaptureRepository = {
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: (from, to) => {
      steps.push(`moved ${from} to ${to}`);
      return Promise.resolve(outcomes.moving?.(from) ?? WRITTEN);
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
    forgetRemoved: (id) => {
      steps.push(`forgot ${id}`);
      return Promise.resolve(outcomes.forgetting ?? WRITTEN);
    },
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const deps: MergeIntoBookDeps = {
    moving: { captures },
    removing: { repository },
    forgetting: { repository },
  };
  return { deps, steps };
}

const HELD = bookId('6a7bd926-held');

const BROKEN = bookId('a816bb74-9c83-4e11-a8bf-ce63119b9e24');

describe('mergeIntoBook', () => {
  it('moves the captures onto the held book before it removes the unreadable row and forgets its record', async () => {
    const origin = world();

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual({ kind: 'merged' });
    expect(origin.steps).toEqual([
      `moved ${BROKEN} to ${HELD}`,
      `removed ${BROKEN}`,
      `forgot ${BROKEN}`,
    ]);
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

  it('reports a partial merge and leaves the unreadable row when it cannot be removed', async () => {
    const origin = world({ removing: STORAGE_UNAVAILABLE });

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual({ kind: 'partly-merged' });
    expect(origin.steps).toEqual([`moved ${BROKEN} to ${HELD}`, `removed ${BROKEN}`]);
  });

  it('reports a partial merge when the record cannot be forgotten', async () => {
    const origin = world({ forgetting: STORAGE_UNAVAILABLE });

    const result = await mergeIntoBook(origin.deps, HELD, [BROKEN]);

    expect(result).toEqual({ kind: 'partly-merged' });
  });

  it('reports a partial merge when a later row cannot be moved after an earlier one merged', async () => {
    const origin = world({
      moving: (from) => (from === 'broken-2' ? STORAGE_UNAVAILABLE : WRITTEN),
    });

    const result = await mergeIntoBook(origin.deps, HELD, [bookId('broken-1'), bookId('broken-2')]);

    expect(result).toEqual({ kind: 'partly-merged' });
  });
});
