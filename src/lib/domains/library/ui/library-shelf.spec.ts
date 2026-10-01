import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { LOADING, readFailed, readReady, reloadFailed, reloading } from '$lib/shared/read-state';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { EMPTY_SHELF, failureOf, libraryBody, shelfOf } from './library-shelf';
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
    expect(libraryBody(reloading(readReady(EMPTY_SHELF)), false)).toBe('reading');
  });

  it('lists what it already holds while a reload settles', () => {
    expect(libraryBody(reloading(readReady(HELD)), false)).toBe('listed');
    expect(libraryBody(LOADING, true)).toBe('listed');
  });

  it('reports a failed read even with books on screen', () => {
    expect(libraryBody(readFailed('denied'), false)).toBe('failed');
    expect(libraryBody(reloadFailed(reloading(readReady(HELD)), 'denied'), false)).toBe('failed');
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
    expect(shelfOf(reloading(readReady(HELD)))).toBe(HELD);
    expect(shelfOf(LOADING)).toBe(EMPTY_SHELF);
    expect(shelfOf(readFailed('denied'))).toBe(EMPTY_SHELF);
  });
});

describe('failureOf', () => {
  it('reports the failure of a first read and of a reload, and nothing otherwise', () => {
    expect(failureOf(readFailed('denied'))).toBe('denied');
    expect(failureOf(reloadFailed(readReady(HELD), 'gone'))).toBe('gone');
    expect(failureOf(reloading(readReady(HELD)))).toBeNull();
    expect(failureOf(LOADING)).toBeNull();
  });
});
