import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Book, BookEdit } from '../domain/book/book';
import type {
  BookLookup,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import { saveReadingPlace } from './save-reading-place';

type UpdateCall = { readonly id: BookId; readonly edit: BookEdit };

const NOW = 1758300000000;

const stored: Book = {
  id: bookId('book-7'),
  title: 'Blame! 1',
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
  position: imagePlace(imageIndex(3)),
  lastReadAt: null,
  finishedAt: null,
};

const WRITTEN: LibraryWrite = { kind: 'success' };

const NO_BOOK: BookLookup = { kind: 'success', book: null };

function fakeRepository(outcome: BookLookup) {
  const updates: UpdateCall[] = [];
  const repository: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books: [] }),
    get: () => Promise.resolve(NO_BOOK),
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
  };
  return { repository, updates };
}

describe('saveReadingPlace', () => {
  it('stores the place and stamps the time it was read', async () => {
    const fake = fakeRepository({ kind: 'success', book: stored });

    await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      imagePlace(imageIndex(12)),
    );

    expect(fake.updates).toEqual([
      {
        id: 'book-7',
        edit: {
          position: { kind: 'image', index: 12, shownThrough: 12, offset: 0 },
          lastReadAt: NOW,
        },
      },
    ]);
  });

  it('stores a text place unchanged', async () => {
    const fake = fakeRepository({ kind: 'success', book: stored });

    await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.37),
    );

    expect(fake.updates).toEqual([
      {
        id: 'book-7',
        edit: {
          position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: 0.37 },
          lastReadAt: NOW,
        },
      },
    ]);
  });

  it('answers not-found for a book the repository no longer holds', async () => {
    const fake = fakeRepository(NO_BOOK);

    const result = await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      imagePlace(imageIndex(12)),
    );

    expect(result).toEqual({ kind: 'not-found', id: 'book-7' });
  });

  it('passes a blocked store through', async () => {
    const fake = fakeRepository(STORAGE_UNAVAILABLE);

    const result = await saveReadingPlace(
      { repository: fake.repository, now: () => NOW },
      bookId('book-7'),
      imagePlace(imageIndex(12)),
    );

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });
});
