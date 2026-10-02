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
    forgetRemoved: (id) => {
      steps.push(`forgot ${id}`);
      return Promise.resolve(outcomes.forgetting ?? WRITTEN);
    },
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const deps: RemoveBookAndCapturesDeps = {
    removing: { repository },
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
