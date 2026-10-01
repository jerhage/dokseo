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
  listedOf,
  shelfOf,
  shelfState,
} from './library-shelf';
import type { LibraryShelf } from './library-shelf';

const BOOK: Book = {
  id: bookId('one'),
  title: 'one',
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
  it('reads the library while it settles with nothing to show', () => {
    expect(libraryBody(LOADING, false)).toBe('reading');
  });

  it('lists the import it holds while the first read settles', () => {
    expect(libraryBody(LOADING, true)).toBe('listed');
  });

  it('reports a failed read even with an import on screen', () => {
    expect(libraryBody(readFailed('denied'), false)).toBe('failed');
    expect(libraryBody(readFailed('denied'), true)).toBe('failed');
  });

  it('invites a first upload when the ready library is empty', () => {
    expect(libraryBody(readReady(EMPTY_SHELF), false)).toBe('empty');
  });

  it('lists a ready library that holds books or an import', () => {
    expect(libraryBody(readReady(HELD), false)).toBe('listed');
    expect(libraryBody(readReady(EMPTY_SHELF), true)).toBe('listed');
  });
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

    expect(shelfState(readReady([BOOK]), covers, 10)).toEqual(
      readReady({ books: [BOOK], covers, storedBytes: 10 }),
    );
  });

  it('keeps a loading or failed read as it is', () => {
    expect(shelfState(LOADING, new Map(), 10)).toBe(LOADING);
    expect(shelfState(readFailed('denied'), new Map(), null)).toEqual(readFailed('denied'));
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

describe('imageCountsOf', () => {
  it('counts the images of each book', () => {
    expect(imageCountsOf([{ ...BOOK, imageCount: 12 }])).toEqual(new Map([[BOOK.id, 12]]));
  });
});
