import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import {
  EMPTY_SHELF,
  failureOf,
  imageCountsOf,
  libraryBody,
  listedBooks,
  listedOf,
  shelfOf,
  shelfState,
} from './library-shelf';
import type { LibraryShelf } from './library-shelf';

const BOOK: Book = {
  id: bookId('one'),
  title: 'one',
  alias: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 182,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
};

const HELD: LibraryShelf = { books: [BOOK], covers: new Map(), storedBytes: 10 };

describe('libraryBody', () => {
  it.each([
    { read: 'loading', state: LOADING, importing: false, body: 'reading' },
    { read: 'loading', state: LOADING, importing: true, body: 'listed' },
    { read: 'failed', state: readFailed('denied'), importing: false, body: 'failed' },
    { read: 'failed', state: readFailed('denied'), importing: true, body: 'failed' },
    { read: 'empty', state: readReady(EMPTY_SHELF), importing: false, body: 'empty' },
    { read: 'holding books', state: readReady(HELD), importing: false, body: 'listed' },
    { read: 'empty', state: readReady(EMPTY_SHELF), importing: true, body: 'listed' },
  ] as const)(
    'answers $body for a library $read when importing is $importing',
    ({ state, importing, body }) => {
      expect(libraryBody(state, importing)).toBe(body);
    },
  );
});

describe('shelfOf', () => {
  it('gives the held shelf once read, and an empty one before', () => {
    expect(shelfOf(readReady(HELD))).toBe(HELD);
    expect(shelfOf(LOADING)).toBe(EMPTY_SHELF);
    expect(shelfOf(readFailed('denied'))).toBe(EMPTY_SHELF);
  });
});

describe('failureOf', () => {
  it('reports the failure of a read, and nothing otherwise', () => {
    expect(failureOf(readFailed('denied'))).toBe('denied');
    expect(failureOf(readReady(HELD))).toBeNull();
    expect(failureOf(LOADING)).toBeNull();
  });
});

describe('shelfState', () => {
  it('puts the covers and the size beside the books once they are read', () => {
    const covers = new Map([[BOOK.id, 'blob:cover']]);

    expect(
      shelfState(readReady({ kind: 'success', books: [BOOK], unreadable: [] }), covers, 10),
    ).toEqual(readReady({ books: [BOOK], covers, storedBytes: 10 }));
  });

  it('names a blocked store as a failed read', () => {
    expect(shelfState(readReady({ kind: 'storage-unavailable' }), new Map(), null)).toEqual(
      readFailed(
        'This browser blocks local storage, so uploads cannot be kept. A private window does not save files, so open the library in a normal window to add a book.',
      ),
    );
  });

  it('keeps a loading or failed read as it is', () => {
    expect(shelfState(LOADING, new Map(), 10)).toBe(LOADING);
    expect(shelfState(readFailed('denied'), new Map(), null)).toEqual(readFailed('denied'));
  });
});

describe('listedBooks', () => {
  it('lists the books of a read listing, and none otherwise', () => {
    expect(listedBooks(readReady({ kind: 'success', books: [BOOK], unreadable: [] }))).toEqual([
      BOOK,
    ]);
    expect(listedBooks(readReady({ kind: 'storage-unavailable' }))).toEqual([]);
    expect(listedBooks(LOADING)).toEqual([]);
  });
});

describe('listedOf', () => {
  it('lists a book for search with the direction its layout reads in', () => {
    expect([BOOK, { ...BOOK, layoutKind: 'continuous' as const }].map(listedOf)).toEqual([
      { id: BOOK.id, title: 'one', language: 'ja', direction: 'rtl' },
      { id: BOOK.id, title: 'one', language: 'ja', direction: 'ltr' },
    ]);
  });
});

describe('listedOf, for a renamed book', () => {
  it('lists the book for search under its alias', () => {
    expect(listedOf({ ...BOOK, alias: 'Mine' }).title).toBe('Mine');
  });
});

describe('imageCountsOf', () => {
  it('counts the images of each book', () => {
    expect(imageCountsOf([{ ...BOOK, imageCount: 12 }])).toEqual(new Map([[BOOK.id, 12]]));
  });
});
