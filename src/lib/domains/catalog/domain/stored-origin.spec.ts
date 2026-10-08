import { describe, expect, it } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import type { BookOrigin } from './book-origin';
import { originLink } from './book-origin';
import { originFromStored, originsFromStored, storedOriginRow } from './stored-origin';

const ORIGIN: BookOrigin = {
  bookId: bookId('book-1'),
  catalogId: catalogId('calibre'),
  entryId: 'urn:uuid:1',
  acquisition: {
    href: 'https://books.example/get/epub/1',
    format: 'epub',
    mediaType: 'application/epub+zip',
    length: null,
  },
  updated: '2026-10-01T00:00:00Z',
  feedPath: [{ title: 'Newest', href: 'https://books.example/opds/new' }],
  feedPosition: 0,
  downloadedAt: 1_760_000_000_000,
};

const ROW = storedOriginRow(ORIGIN);

describe('originFromStored', () => {
  it('reads back the row it wrote', () => {
    expect(originFromStored(ROW)).toEqual(ORIGIN);
  });

  it.each([
    ['a missing entry id', { ...ROW, entryId: undefined }],
    ['an empty entry id', { ...ROW, entryId: '' }],
    ['a book id that is not a flat key', { ...ROW, bookId: 'a/b' }],
    ['a catalog id that is not a flat key', { ...ROW, catalogId: '..' }],
    [
      'an unknown acquisition format',
      { ...ROW, acquisition: { ...ORIGIN.acquisition, format: 'mobi' } },
    ],
    ['an acquisition that is not an object', { ...ROW, acquisition: 'link' }],
    [
      'a negative acquisition length',
      { ...ROW, acquisition: { ...ORIGIN.acquisition, length: -1 } },
    ],
    ['a feed path with a step lacking its title', { ...ROW, feedPath: [{ href: 'x' }] }],
    ['a feed path that is not a list', { ...ROW, feedPath: 'Newest' }],
    ['a fractional feed position', { ...ROW, feedPosition: 1.5 }],
    ['a download time that is text', { ...ROW, downloadedAt: 'yesterday' }],
  ])('rejects %s', (_name, row) => {
    expect(() => originFromStored(row)).toThrow();
  });
});

describe('originsFromStored', () => {
  it('separates readable origins from damaged rows that still have a book id', () => {
    const damaged = { ...ROW, bookId: 'book-2', feedPosition: -3 };

    const { origins, unreadable } = originsFromStored([ROW, damaged]);

    expect(origins).toEqual([ORIGIN]);
    expect(unreadable).toEqual([{ bookId: 'book-2', stored: damaged }]);
  });

  it('throws on a damaged row that has no book id to report', () => {
    expect(() => originsFromStored([{ entryId: 'urn:uuid:1' }])).toThrow();
  });
});

describe('originLink', () => {
  it('gives the book and the updated time the classifier compares', () => {
    expect(originLink(ORIGIN)).toEqual({
      bookId: 'book-1',
      updated: '2026-10-01T00:00:00Z',
    });
  });
});
