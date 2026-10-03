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
import { deleteRemovedBookCaptures } from './delete-removed-book-captures';
import type { DeleteRemovedBookCapturesDeps } from './delete-removed-book-captures';

const WRITTEN: LibraryWrite = { kind: 'success' };

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

type Outcomes = { readonly clearing?: CaptureWrite; readonly forgetting?: LibraryWrite };

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
    remove: notUsed,
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
  const deps: DeleteRemovedBookCapturesDeps = {
    clearing: { captures },
    forgetting: { repository },
  };
  return { deps, steps };
}

describe('deleteRemovedBookCaptures', () => {
  it('deletes the captures of a removed book, then its removed record', async () => {
    const origin = world();

    const result = await deleteRemovedBookCaptures(origin.deps, bookId('gone-1'));

    expect(result).toEqual(WRITTEN);
    expect(origin.steps).toEqual(['cleared gone-1', 'forgot gone-1']);
  });

  it('keeps the removed record when the captures cannot be deleted', async () => {
    const origin = world({ clearing: STORAGE_UNAVAILABLE });

    const result = await deleteRemovedBookCaptures(origin.deps, bookId('gone-1'));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(origin.steps).toEqual(['cleared gone-1']);
  });
});
