import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, imagePlace, textPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Book, BookEdit } from '../domain/book/book';
import type {
  BookLookup,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import { markUnread } from './mark-unread';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

const comic: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(181)),
  lastReadAt: 1758300000000,
  finishedAt: 1758400000000,
};

const novel: Book = {
  ...comic,
  layoutKind: 'flow',
  sourceKind: 'epub',
  imageCount: 0,
  position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', 1),
};

const WRITTEN: LibraryWrite = { kind: 'success' };

const NO_BOOK: BookLookup = { kind: 'success', book: null };

function fakeRepository(found: BookLookup, outcome = found) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [], unreadable: [] }),
    get: () => Promise.resolve(found),
    add: () => Promise.resolve(WRITTEN),
    remove: () => Promise.resolve(WRITTEN),
    update: (id, edit) => {
      updates.push({ id, edit });
      return Promise.resolve(outcome);
    },
    readSource: () => Promise.resolve({ kind: 'success', file: null }),
    readCover: () => Promise.resolve({ kind: 'success', file: null }),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
    listRemoved: () => Promise.resolve({ kind: 'success', removed: [] }),
    listRestorable: () => Promise.resolve({ kind: 'success', removed: [], unreadable: [] }),
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: () => Promise.resolve({ kind: 'success' }),
  };
  return { repository, updates };
}

describe('markUnread', () => {
  it('clears the mark and the last read time, and returns an image book to its first image', async () => {
    const fake = fakeRepository({ kind: 'success', book: comic });

    await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(fake.updates).toEqual([
      {
        id: 'book-7',
        edit: {
          finishedAt: null,
          lastReadAt: null,
          position: { kind: 'image', index: 0, shownThrough: 0, offset: 0 },
        },
      },
    ]);
  });

  it('returns a text book to the start of the text', async () => {
    const fake = fakeRepository({ kind: 'success', book: novel });

    await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(fake.updates).toEqual([
      { id: 'book-7', edit: { finishedAt: null, lastReadAt: null, position: START_OF_THE_TEXT } },
    ]);
  });

  it('changes nothing and reports a book it cannot find', async () => {
    const fake = fakeRepository(NO_BOOK);

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual({ kind: 'not-found', id: 'book-7' });
    expect(fake.updates).toEqual([]);
  });

  it('returns the book the update stored', async () => {
    const marked = { ...comic, finishedAt: null, lastReadAt: null };
    const fake = fakeRepository(
      { kind: 'success', book: comic },
      { kind: 'success', book: marked },
    );

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual({ kind: 'success', book: marked });
  });

  it('answers not-found for a book removed between the read and the update', async () => {
    const fake = fakeRepository({ kind: 'success', book: comic }, NO_BOOK);

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual({ kind: 'not-found', id: 'book-7' });
  });

  it('passes a blocked store through', async () => {
    const fake = fakeRepository(STORAGE_UNAVAILABLE);

    const result = await markUnread({ repository: fake.repository }, bookId('book-7'));

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(fake.updates).toEqual([]);
  });
});
