import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type {
  BookListing,
  LibraryRepository,
  RemovedListing,
} from '$lib/domains/library/domain/book/library-repository';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type {
  CaptureListing,
  CaptureRepository,
} from '$lib/domains/recognition/domain/capture/capture-repository';
import { bookId, captureId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { listRemovedBooksAndCaptures } from './list-removed-books-and-captures';
import type { ListRemovedBooksAndCapturesDeps } from './list-removed-books-and-captures';

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function removedBook(id: string): RemovedBook {
  return {
    id: bookId(id),
    title: `Title ${id}`,
    contentHash: '0123456789abcdef0123456789abcdef',
    fileName: `${id}.cbz`,
    language: 'ja',
    direction: 'rtl',
  };
}

function capturedIn(book: string, index: number): Capture {
  return { id: captureId(`${book}-${index}`), bookId: bookId(book) } as Capture;
}

function heldBook(id: string): Book {
  return { id: bookId(id) } as Book;
}

type Outcomes = {
  readonly shelf?: BookListing;
  readonly removed?: RemovedListing;
  readonly captures?: CaptureListing;
};

function deps(outcomes: Outcomes): ListRemovedBooksAndCapturesDeps {
  const repository: LibraryRepository = {
    list: () => Promise.resolve(outcomes.shelf ?? { kind: 'success', books: [], unreadable: [] }),
    listRemoved: () => Promise.resolve(outcomes.removed ?? { kind: 'success', removed: [] }),
    get: notUsed,
    add: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    listRestorable: notUsed,
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    storedBytes: notUsed,
  };
  const captures: CaptureRepository = {
    listEverything: () =>
      Promise.resolve(outcomes.captures ?? { kind: 'success', captures: [], unreadable: [] }),
    listForBook: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
  };
  return { shelf: { repository }, removed: { repository }, captures: { captures } };
}

describe('listRemovedBooksAndCaptures', () => {
  it('counts the captures each removed book kept', async () => {
    const result = await listRemovedBooksAndCaptures(
      deps({
        removed: { kind: 'success', removed: [removedBook('gone-1'), removedBook('gone-2')] },
        captures: {
          kind: 'success',
          captures: [capturedIn('gone-1', 1), capturedIn('gone-1', 2)],
          unreadable: [],
        },
      }),
    );

    expect(result).toEqual({
      kind: 'success',
      entries: [
        { kind: 'recorded', book: removedBook('gone-1'), captureCount: 2 },
        { kind: 'recorded', book: removedBook('gone-2'), captureCount: 0 },
      ],
    });
  });

  it('lists the captures of a book with no book and no removed record as an unknown book', async () => {
    const result = await listRemovedBooksAndCaptures(
      deps({
        shelf: {
          kind: 'success',
          books: [heldBook('live-1')],
          unreadable: [{ id: bookId('broken-1'), title: null }],
        },
        captures: {
          kind: 'success',
          captures: [
            capturedIn('live-1', 1),
            capturedIn('broken-1', 1),
            capturedIn('lost-1', 1),
            capturedIn('lost-1', 2),
          ],
          unreadable: [],
        },
      }),
    );

    expect(result).toEqual({
      kind: 'success',
      entries: [{ kind: 'unknown', id: 'lost-1', captureCount: 2 }],
    });
  });

  it('leaves out a removed record whose id is a book on the shelf again', async () => {
    const result = await listRemovedBooksAndCaptures(
      deps({
        shelf: { kind: 'success', books: [heldBook('gone-1')], unreadable: [] },
        removed: { kind: 'success', removed: [removedBook('gone-1')] },
      }),
    );

    expect(result).toEqual({ kind: 'success', entries: [] });
  });

  it('passes a blocked store through', async () => {
    const result = await listRemovedBooksAndCaptures(deps({ captures: STORAGE_UNAVAILABLE }));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });
});
