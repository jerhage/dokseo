import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { PAGE_PAIRINGS } from '$lib/shared/layout-kind';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';
import { CorruptRow } from '$lib/shared/corrupt-row';
import {
  bookFromStored,
  booksFromStored,
  FALLBACK_DIRECTION,
  FALLBACK_LANGUAGE,
  savedBookRow,
} from './stored-book';
import type { StoredBook } from './stored-book';

const row: StoredBook = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash('9f86d081'),
  fileName: 'Yotsuba&! 1.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(3), imageIndex(4), 0.35),
  lastReadAt: 1758300000000,
  finishedAt: null,
};

describe('bookFromStored', () => {
  it('keeps a stored pairing that is present', () => {
    for (const pairing of PAGE_PAIRINGS) {
      expect(bookFromStored({ ...row, pagePairing: pairing }).pagePairing).toBe(pairing);
    }
    expect(PAGE_PAIRINGS).toEqual(['single', 'double', 'double-after-cover']);
  });

  it('keeps an automatic pairing, and keeps a stored two-pages-after-the-cover as the choice it is', () => {
    expect(bookFromStored({ ...row, pagePairing: 'auto' }).pagePairing).toBe('auto');
    expect(bookFromStored({ ...row, pagePairing: 'double-after-cover' }).pagePairing).toBe(
      'double-after-cover',
    );
  });

  it('keeps a stored fit that is present', () => {
    expect(bookFromStored({ ...row, pageFit: 'width' }).pageFit).toBe('width');
    expect(bookFromStored({ ...row, layoutKind: 'continuous', pageFit: 'height' }).pageFit).toBe(
      'height',
    );
  });

  it.each([
    ['whole', imagePlace(imageIndex(12)), { index: 12, shownThrough: 12, offset: 0 }],
    [
      'with the last image it showed',
      imagePlace(imageIndex(3), imageIndex(4)),
      { index: 3, shownThrough: 4, offset: 0 },
    ],
    [
      'with the fraction down the image it was left at',
      imagePlace(imageIndex(3), imageIndex(4), 0.35),
      { index: 3, shownThrough: 4, offset: 0.35 },
    ],
  ])('reads a stored image place back %s', (_, position, expected) => {
    const stored: StoredBook = { ...row, position };
    expect(bookFromStored(stored).position).toEqual({ kind: 'image', ...expected });
  });

  it('reads a stored offset outside the image back inside it', () => {
    const stored: StoredBook = {
      ...row,
      position: { kind: 'image', index: imageIndex(12), shownThrough: imageIndex(12), offset: 7 },
    };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 12,
      shownThrough: 12,
      offset: 1,
    });
  });

  it.each([0.37, null])('keeps a stored fraction of %s, or its absence, as it is', (fraction) => {
    const stored: StoredBook = {
      ...row,
      position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', fraction),
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction,
    });
  });

  it('reads a stored fraction the book could never have reached as no fraction', () => {
    const stored: StoredBook = {
      ...row,
      position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: Number.NaN },
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: null,
    });
  });

  it('keeps a stored content hash that is present', () => {
    const stored: StoredBook = { ...row, contentHash: contentHash('a1b2c3d4') };

    expect(bookFromStored(stored).contentHash).toBe('a1b2c3d4');
  });

  it('reads a row stored without an alias as a book with none', () => {
    expect('alias' in row).toBe(false);
    expect(bookFromStored(row).alias).toBeNull();
  });

  it.each(['Mine', null])('keeps a stored alias %j', (alias) => {
    const renamed = bookFromStored({ ...row, alias });

    expect(renamed.alias).toBe(alias);
    expect(renamed.title).toBe('Yotsuba&! 1');
  });

  it('keeps a stored file name that is present', () => {
    expect(bookFromStored({ ...row, fileName: 'Yotsuba&! 2.cbz' }).fileName).toBe(
      'Yotsuba&! 2.cbz',
    );
  });

  it('leaves every other field exactly as stored', () => {
    const expected: Book = {
      id: bookId('b-1'),
      title: 'Yotsuba&! 1',
      alias: null,
      language: 'ja',
      layoutKind: 'paged',
      direction: 'rtl',
      pagePairing: 'single',
      pageFit: 'width',
      sourceKind: 'archive',
      contentHash: contentHash('9f86d081'),
      fileName: 'Yotsuba&! 1.cbz',
      imageCount: 182,
      addedAt: 1758240000000,
      position: imagePlace(imageIndex(3), imageIndex(4), 0.35),
      lastReadAt: 1758300000000,
      finishedAt: null,
    };
    expect(bookFromStored(row)).toEqual(expected);
  });

  it.each([
    [1758300000000, 1758400000000],
    [null, null],
  ])('keeps the stored reading times %s and %s as they are', (lastReadAt, finishedAt) => {
    const book = bookFromStored({ ...row, lastReadAt, finishedAt });

    expect(book.lastReadAt).toBe(lastReadAt);
    expect(book.finishedAt).toBe(finishedAt);
  });

  it('returns a new object and leaves the stored record untouched', () => {
    const stored: StoredBook = { ...row, pagePairing: 'triple' };
    const book = bookFromStored(stored);
    expect(book).not.toBe(stored);
    expect(stored.pagePairing).toBe('triple');
  });

  it('keeps every stored language, layout kind, direction and source kind it knows', () => {
    const book = bookFromStored({
      ...row,
      language: 'ko',
      layoutKind: 'flow',
      direction: 'ltr',
      sourceKind: 'epub',
    });

    expect([book.language, book.layoutKind, book.direction, book.sourceKind]).toEqual([
      'ko',
      'flow',
      'ltr',
      'epub',
    ]);
  });

  it('falls back to the first language for a stored language it does not know', () => {
    expect(bookFromStored({ ...row, language: 'xx' }).language).toBe(FALLBACK_LANGUAGE);
    expect(FALLBACK_LANGUAGE).toBe('ja');
  });

  it('falls back to right to left for a stored direction it does not know', () => {
    expect(bookFromStored({ ...row, direction: 'down' }).direction).toBe(FALLBACK_DIRECTION);
    expect(FALLBACK_DIRECTION).toBe('rtl');
  });

  it('falls back to the default pairing for a stored pairing it does not know', () => {
    expect(bookFromStored({ ...row, pagePairing: 'triple' }).pagePairing).toBe(
      DEFAULT_PAGE_PAIRING,
    );
    expect(DEFAULT_PAGE_PAIRING).toBe('auto');
  });

  it('falls back to the fit of the layout kind for a stored fit it does not know', () => {
    expect(bookFromStored({ ...row, layoutKind: 'continuous', pageFit: 7 }).pageFit).toBe('width');
  });

  it('throws a corrupt row for a stored layout kind it does not know', () => {
    expect(() => bookFromStored({ ...row, layoutKind: 'scroll' })).toThrow(CorruptRow);
    expect(() => bookFromStored({ ...row, layoutKind: 'scroll' })).toThrow(
      'A stored book holds an unknown layout kind: scroll',
    );
  });

  it('throws a corrupt row for a stored source kind it does not know', () => {
    expect(() => bookFromStored({ ...row, sourceKind: 'mobi' })).toThrow(
      'A stored book holds an unknown source kind: mobi',
    );
  });
});

describe('savedBookRow', () => {
  it('keeps every stored field the book does not know', () => {
    const stored = { ...row, shelfColour: 'teal', series: { name: 'Yotsuba&!' } };

    const saved = savedBookRow(stored, bookFromStored(stored));

    expect(saved).toMatchObject({ shelfColour: 'teal', series: { name: 'Yotsuba&!' } });
  });

  it('writes every known field from the book, over the stored value', () => {
    const stored = { ...row, language: 'xx', pagePairing: 'triple', shelfColour: 'teal' };
    const book = { ...bookFromStored(stored), alias: 'Mine' };

    const saved = savedBookRow(stored, book);

    expect(saved).toEqual({ ...book, shelfColour: 'teal' });
    expect(saved).toMatchObject({ language: 'ja', pagePairing: 'auto', alias: 'Mine' });
  });

  it('leaves the stored row untouched', () => {
    const stored = { ...row, shelfColour: 'teal' };

    savedBookRow(stored, { ...bookFromStored(stored), alias: 'Mine' });

    expect(stored).toEqual({ ...row, shelfColour: 'teal' });
  });
});

function without(field: string): StoredBook {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));
}

describe('booksFromStored', () => {
  it.each([
    'title',
    'layoutKind',
    'sourceKind',
    'contentHash',
    'fileName',
    'imageCount',
    'addedAt',
    'position',
    'lastReadAt',
    'finishedAt',
  ])('reports a row without its %s as unreadable', (field) => {
    const read = booksFromStored([without(field)]);

    expect(read.books).toEqual([]);
    expect(read.unreadable.map((book) => book.id)).toEqual(['b-1']);
  });

  it.each([
    ['title', 7],
    ['alias', 7],
    ['alias', { name: 'Mine' }],
    ['contentHash', null],
    ['fileName', 12],
    ['imageCount', '182'],
    ['addedAt', null],
    ['lastReadAt', '1758300000000'],
    ['finishedAt', false],
    ['position', 45],
    ['position', { kind: 'page', index: 3 }],
    ['position', { kind: 'image', index: 3, offset: 0 }],
    ['position', { kind: 'image', index: 3, shownThrough: 3 }],
    ['position', { kind: 'text', fraction: 0.5 }],
    ['position', { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)' }],
  ])('reports a row whose %s holds %j as unreadable', (field, value) => {
    const read = booksFromStored([{ ...row, [field]: value }]);

    expect(read.books).toEqual([]);
    expect(read.unreadable.map((book) => book.id)).toEqual(['b-1']);
  });

  it.each(['language', 'direction', 'pagePairing', 'pageFit'])(
    'reads a row without its %s through the fallback',
    (field) => {
      expect(booksFromStored([without(field)]).books.map((book) => book.id)).toEqual(['b-1']);
    },
  );

  it('names the field a stored book lacks', () => {
    expect(() => bookFromStored(without('lastReadAt'))).toThrow(
      'A stored book lacks its last read time',
    );
  });

  it('reports a row whose mapping throws as unreadable and keeps the rows that read', () => {
    const scrolled: StoredBook = { ...row, id: bookId('b-2'), layoutKind: 'scroll' };
    const read = booksFromStored([row, scrolled]);

    expect(read.books.map((book) => book.id)).toEqual(['b-1']);
    expect(read.unreadable).toEqual([
      {
        id: 'b-2',
        title: 'Yotsuba&! 1',
        alias: null,
        contentHash: '9f86d081',
        fileName: 'Yotsuba&! 1.cbz',
      },
    ]);
  });

  it('reports no title for an unreadable row whose title is not a string', () => {
    const untitled = { ...row, title: 7, layoutKind: 'scroll' } as unknown as StoredBook;

    expect(booksFromStored([untitled]).unreadable).toEqual([
      { id: 'b-1', title: null, alias: null, contentHash: '9f86d081', fileName: 'Yotsuba&! 1.cbz' },
    ]);
  });

  it('keeps the alias of an unreadable row', () => {
    const renamed: StoredBook = { ...row, alias: 'Mine', layoutKind: 'scroll' };

    expect(booksFromStored([renamed]).unreadable).toEqual([
      {
        id: 'b-1',
        title: 'Yotsuba&! 1',
        alias: 'Mine',
        contentHash: '9f86d081',
        fileName: 'Yotsuba&! 1.cbz',
      },
    ]);
  });

  it('rethrows the mapping failure of a row without a usable id', () => {
    const nameless = { ...row, id: 'a/b', layoutKind: 'scroll' } as unknown as StoredBook;

    expect(() => booksFromStored([nameless])).toThrow(CorruptRow);
  });
});
