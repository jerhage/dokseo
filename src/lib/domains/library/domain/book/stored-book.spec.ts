import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { PAGE_PAIRINGS } from '$lib/shared/layout-kind';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import type { Book } from './book';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { bookFromStored, booksFromStored } from './stored-book';
import type { StoredBook } from './stored-book';

const HASH = '9f86d081884c7d659a2feaa0c55ad015';

const row: StoredBook = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash(HASH),
  fileName: 'Yotsuba&! 1.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(3), imageIndex(4), 0.35),
  lastReadAt: 1758300000000,
  finishedAt: null,
};

const flowRow: StoredBook = {
  ...row,
  layoutKind: 'flow',
  sourceKind: 'epub',
  imageCount: 0,
  position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.37),
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

  it.each([0.37, null])('keeps a stored fraction of %s, or its absence, as it is', (fraction) => {
    const stored: StoredBook = {
      ...flowRow,
      position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', fraction),
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction,
    });
  });

  it('keeps a stored content hash that is present', () => {
    const stored: StoredBook = { ...row, contentHash: '0123456789abcdef0123456789abcdef' };

    expect(bookFromStored(stored).contentHash).toBe('0123456789abcdef0123456789abcdef');
  });

  it.each(['Mine', null])('keeps a stored alias %j', (alias) => {
    const renamed = bookFromStored({ ...row, alias });

    expect(renamed.alias).toBe(alias);
    expect(renamed.title).toBe('Yotsuba&! 1');
  });

  it('keeps a stored null series id and volume', () => {
    expect(bookFromStored({ ...row, seriesId: null, volume: null })).toMatchObject({
      seriesId: null,
      volume: null,
    });
  });

  it('keeps a stored series id and volume', () => {
    const book = bookFromStored({
      ...row,
      seriesId: '0f8e2c4a-6b1d-4e7f-9a3c-5d2b8e1f7a60',
      volume: 1.5,
    });

    expect(book.seriesId).toBe('0f8e2c4a-6b1d-4e7f-9a3c-5d2b8e1f7a60');
    expect(book.volume).toBe(1.5);
  });

  it.each([7, true, { id: 'series-1' }, ''])(
    'throws a corrupt row for a stored series id %j',
    (id) => {
      expect(() => bookFromStored({ ...row, seriesId: id })).toThrow(
        `A stored book holds an unknown series id: ${String(id)}`,
      );
    },
  );

  it.each(['2', Number.NaN, Number.POSITIVE_INFINITY, true])(
    'throws a corrupt row for a stored volume %s',
    (volume) => {
      expect(() => bookFromStored({ ...row, volume })).toThrow(CorruptRow);
    },
  );

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
      seriesId: null,
      volume: null,
      language: 'ja',
      layoutKind: 'paged',
      direction: 'rtl',
      pagePairing: 'single',
      pageFit: 'width',
      sourceKind: 'archive',
      contentHash: contentHash(HASH),
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
    const stored: StoredBook = { ...row };
    const book = bookFromStored(stored);
    expect(book).not.toBe(stored);
    expect(stored).toEqual(row);
  });

  it('keeps every stored language, layout kind, direction and source kind it knows', () => {
    const book = bookFromStored({ ...flowRow, language: 'ko', direction: 'ltr' });

    expect([book.language, book.layoutKind, book.direction, book.sourceKind]).toEqual([
      'ko',
      'flow',
      'ltr',
      'epub',
    ]);
  });

  it.each([
    ['language', 'xx', 'A stored book holds an unknown language: xx'],
    ['direction', 'down', 'A stored book holds an unknown direction: down'],
    ['pagePairing', 'triple', 'A stored book holds an unknown page pairing: triple'],
    ['pageFit', 7, 'A stored book holds an unknown page fit: 7'],
  ])('throws a corrupt row for a stored %s it does not know', (field, value, message) => {
    expect(() => bookFromStored({ ...row, [field]: value })).toThrow(message);
  });

  it.each([
    ['a flow book stored from a PDF', { ...flowRow, sourceKind: 'pdf' }],
    ['a flow book stored from an archive', { ...flowRow, sourceKind: 'archive' }],
    ['a paged book stored at a text place', { ...row, position: textPlace('', null) }],
    [
      'a continuous book stored at a text place',
      { ...row, layoutKind: 'continuous', position: textPlace('', null) },
    ],
    ['a flow book stored at an image place', { ...flowRow, position: imagePlace(imageIndex(0)) }],
  ])('throws a corrupt row for %s', (_, stored) => {
    expect(() => bookFromStored(stored)).toThrow(CorruptRow);
  });

  it.each(['pdf', 'epub', 'images', 'archive'])(
    'reads a paged book stored from a %s source',
    (sourceKind) => {
      expect(bookFromStored({ ...row, sourceKind }).sourceKind).toBe(sourceKind);
    },
  );

  it('names the layout kind a stored place contradicts', () => {
    expect(() => bookFromStored({ ...row, position: textPlace('', null) })).toThrow(
      'A stored book holds an unknown position kind for a paged book: text',
    );
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

function without(field: string): StoredBook {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));
}

describe('booksFromStored', () => {
  it.each([
    'title',
    'alias',
    'seriesId',
    'volume',
    'language',
    'layoutKind',
    'direction',
    'pagePairing',
    'pageFit',
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
    ['contentHash', ''],
    ['contentHash', '9f86d081'],
    ['contentHash', 'a'.repeat(64)],
    ['contentHash', '9F86D081884C7D659A2FEAA0C55AD015'],
    ['contentHash', `${HASH} `],
    ['contentHash', 'g'.repeat(32)],
    ['fileName', 12],
    ['imageCount', '182'],
    ['imageCount', -1],
    ['imageCount', 1.5],
    ['imageCount', Number.NaN],
    ['imageCount', Number.POSITIVE_INFINITY],
    ['addedAt', null],
    ['addedAt', Number.NaN],
    ['addedAt', Number.NEGATIVE_INFINITY],
    ['lastReadAt', '1758300000000'],
    ['lastReadAt', Number.POSITIVE_INFINITY],
    ['finishedAt', false],
    ['finishedAt', Number.NaN],
    ['position', 45],
    ['position', { kind: 'page', index: 3 }],
    ['position', { kind: 'image', index: 3, offset: 0 }],
    ['position', { kind: 'image', index: 3, shownThrough: 3 }],
    ['position', { kind: 'image', index: -1, shownThrough: 3, offset: 0 }],
    ['position', { kind: 'image', index: 1.5, shownThrough: 3, offset: 0 }],
    ['position', { kind: 'image', index: Number.NaN, shownThrough: 3, offset: 0 }],
    ['position', { kind: 'image', index: 3, shownThrough: Number.POSITIVE_INFINITY, offset: 0 }],
    ['position', { kind: 'image', index: 4, shownThrough: 3, offset: 0 }],
    ['position', { kind: 'image', index: 3, shownThrough: 3, offset: 7 }],
    ['position', { kind: 'image', index: 3, shownThrough: 3, offset: -0.1 }],
    ['position', { kind: 'image', index: 3, shownThrough: 3, offset: Number.NaN }],
  ])('reports a row whose %s holds %j as unreadable', (field, value) => {
    const read = booksFromStored([{ ...row, [field]: value }]);

    expect(read.books).toEqual([]);
    expect(read.unreadable.map((book) => book.id)).toEqual(['b-1']);
  });

  it.each([
    ['without its cfi', { kind: 'text', fraction: 0.5 }],
    ['without its fraction', { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)' }],
    ['past the end of the text', { kind: 'text', cfi: '', fraction: 1.5 }],
    ['before the start of the text', { kind: 'text', cfi: '', fraction: -0.1 }],
    ['at no number', { kind: 'text', cfi: '', fraction: Number.NaN }],
  ])('reports a flow row whose place is %s as unreadable', (_, position) => {
    const read = booksFromStored([{ ...flowRow, position }]);

    expect(read.books).toEqual([]);
    expect(read.unreadable.map((book) => book.id)).toEqual(['b-1']);
  });

  it('reads an image place at the first image, at the top, as it is', () => {
    expect(bookFromStored({ ...row, position: imagePlace(imageIndex(0)) }).position).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
  });

  it.each([0, 1])('reads a text place at the fraction %s as it is', (fraction) => {
    expect(bookFromStored({ ...flowRow, position: textPlace('', fraction) }).position).toEqual({
      kind: 'text',
      cfi: '',
      fraction,
    });
  });

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
        contentHash: HASH,
        fileName: 'Yotsuba&! 1.cbz',
        stored: scrolled,
      },
    ]);
  });

  it('reports no title for an unreadable row whose title is not a string', () => {
    const untitled = { ...row, title: 7, layoutKind: 'scroll' } as unknown as StoredBook;

    expect(booksFromStored([untitled]).unreadable).toEqual([
      {
        id: 'b-1',
        title: null,
        alias: null,
        contentHash: HASH,
        fileName: 'Yotsuba&! 1.cbz',
        stored: untitled,
      },
    ]);
  });

  it('keeps the alias of an unreadable row', () => {
    const renamed: StoredBook = { ...row, alias: 'Mine', layoutKind: 'scroll' };

    expect(booksFromStored([renamed]).unreadable).toEqual([
      {
        id: 'b-1',
        title: 'Yotsuba&! 1',
        alias: 'Mine',
        contentHash: HASH,
        fileName: 'Yotsuba&! 1.cbz',
        stored: renamed,
      },
    ]);
  });

  it('rethrows the mapping failure of a row without a usable id', () => {
    const nameless = { ...row, id: 'a/b', layoutKind: 'scroll' } as unknown as StoredBook;

    expect(() => booksFromStored([nameless])).toThrow(CorruptRow);
  });
});
