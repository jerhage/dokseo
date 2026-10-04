import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex, seriesId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, imagePlace, textPlace } from '$lib/shared/reading-place';
import { applyEdit, defaultPageFit, startingPlace } from './book';
import type { Book } from './book';

const book: Book = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'double',
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

describe('applyEdit', () => {
  it.each([
    [
      'an index',
      imagePlace(imageIndex(7)),
      { kind: 'image', index: 7, shownThrough: 7, offset: 0 },
    ],
    [
      'the first index',
      imagePlace(imageIndex(0)),
      { kind: 'image', index: 0, shownThrough: 0, offset: 0 },
    ],
    [
      'a text place',
      textPlace('epubcfi(/6/14!/4/2/1:0)', null),
      { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/1:0)', fraction: null },
    ],
  ] as const)(
    'moves the position to %s and preserves every other field',
    (_, position, expected) => {
      const edited = applyEdit(book, { position });

      expect(edited.position).toEqual(expected);
      expect(edited).toEqual({ ...book, position });
    },
  );

  it.each([
    [
      'an alias and a language',
      { alias: 'Blame! 1', language: 'ko' },
      { alias: 'Blame! 1', language: 'ko' },
    ],
    ['the direction a paged book already reads in', { direction: 'rtl' }, {}],
    ['a paged layout to a paged book', { layoutKind: 'paged' }, {}],
    [
      'a pairing chosen for a paged book',
      { pagePairing: 'double-after-cover' },
      { pagePairing: 'double-after-cover' },
    ],
  ] as const)(
    'replaces only the named fields and leaves the rest alone, for %s',
    (_, edit, changed) => {
      expect(applyEdit(book, edit)).toEqual({ ...book, ...changed });
    },
  );

  it('sets the series id and volume an edit names', () => {
    const edited = applyEdit(book, { seriesId: seriesId('series-1'), volume: 3 });

    expect(edited).toEqual({ ...book, seriesId: 'series-1', volume: 3 });
  });

  it('keeps the series id and volume when the edit does not name them', () => {
    const inSeries = { ...book, seriesId: seriesId('series-1'), volume: 3 };

    expect(applyEdit(inSeries, { alias: 'Mine' })).toMatchObject({
      seriesId: 'series-1',
      volume: 3,
    });
  });

  it('clears the series id and volume when the edit gives null', () => {
    const inSeries = { ...book, seriesId: seriesId('series-1'), volume: 3 };

    expect(applyEdit(inSeries, { seriesId: null, volume: null })).toMatchObject({
      seriesId: null,
      volume: null,
    });
  });

  it('returns a new object and leaves the original untouched', () => {
    const edited = applyEdit(book, { alias: 'Blame! 1', position: imagePlace(imageIndex(7)) });
    expect(edited).not.toBe(book);
    expect(book.alias).toBeNull();
    expect(book.position).toEqual({ kind: 'image', index: 3, shownThrough: 3, offset: 0 });
  });

  it.each([
    [
      'stamps the time the book was last read',
      {},
      { lastReadAt: 1758300000000 },
      'lastReadAt',
      1758300000000,
    ],
    [
      'keeps the last read time when the edit does not give one',
      { lastReadAt: 1758300000000 },
      { alias: 'Blame! 1' },
      'lastReadAt',
      1758300000000,
    ],
    [
      'clears the last read time when the edit gives null',
      { lastReadAt: 1758300000000 },
      { lastReadAt: null },
      'lastReadAt',
      null,
    ],
    [
      'marks the book finished at the given time',
      {},
      { finishedAt: 1758400000000 },
      'finishedAt',
      1758400000000,
    ],
    [
      'clears the finished mark when the edit gives null',
      { finishedAt: 1758400000000 },
      { finishedAt: null },
      'finishedAt',
      null,
    ],
    [
      'keeps the finished mark when the edit does not name it',
      { finishedAt: 1758400000000 },
      { position: imagePlace(imageIndex(0)) },
      'finishedAt',
      1758400000000,
    ],
  ] as const)('%s', (_, stored, edit, field, expected) => {
    expect(applyEdit({ ...book, ...stored }, edit)[field]).toBe(expected);
  });

  it('returns a right-to-left two-page book unharmed from a trip through continuous', () => {
    const strip = applyEdit(book, { layoutKind: 'continuous' });
    const back = applyEdit(strip, { layoutKind: 'paged' });

    expect(strip.layoutKind).toBe('continuous');
    expect(strip.direction).toBe('rtl');
    expect(strip.pagePairing).toBe('double');
    expect(back.direction).toBe('rtl');
    expect(back.pagePairing).toBe('double');
  });

  it.each([
    ['direction', 'direction', { direction: 'ltr' }, { direction: 'rtl' }, 'rtl', 'ltr'],
    [
      'pairing',
      'pagePairing',
      {},
      { pagePairing: 'double-after-cover' },
      'double-after-cover',
      'double',
    ],
  ] as const)(
    'stores a %s chosen for a book that is already continuous',
    (_, field, stored, edit, chosen, kept) => {
      const webtoon: Book = { ...book, layoutKind: 'continuous', ...stored };

      expect(applyEdit(webtoon, edit)[field]).toBe(chosen);
      expect(applyEdit(webtoon, { alias: 'Tower of God' })[field]).toBe(kept);
    },
  );

  it('forces the fit to width when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous', pageFit: 'height' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.pageFit).toBe('width');
  });

  it('forces the fit to width when the book is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous' };
    expect(applyEdit(webtoon, { pageFit: 'height' }).pageFit).toBe('width');
    expect(applyEdit(webtoon, { alias: 'Tower of God' }).pageFit).toBe('width');
  });

  it('keeps a chosen fit on a paged book', () => {
    expect(applyEdit(book, { pageFit: 'width' }).pageFit).toBe('width');
    expect(applyEdit(book, { layoutKind: 'paged' }).pageFit).toBe('height');
  });

  it('writes a rename to the alias and keeps the original title', () => {
    const renamed = applyEdit(book, { alias: '  Blame! 1 \n' });

    expect(renamed.alias).toBe('Blame! 1');
    expect(renamed.title).toBe('Yotsuba&! 1');
  });

  it.each([
    ['null', null],
    ['an empty name', ''],
    ['a blank name', '   '],
    ['the original title', ' Yotsuba&! 1 '],
  ])('clears the alias when the edit gives %s', (_, alias) => {
    const renamed: Book = { ...book, alias: 'Blame! 1' };

    expect(applyEdit(renamed, { alias })).toEqual(book);
  });

  it('keeps the alias when the edit does not name it', () => {
    const renamed: Book = { ...book, alias: 'Blame! 1' };

    expect(applyEdit(renamed, { language: 'ko' }).alias).toBe('Blame! 1');
  });
});

describe('defaultPageFit', () => {
  it.each([
    ['fits a paged book to its height', 'paged', 'height'],
    ['fits a continuous book to its width', 'continuous', 'width'],
    ['answers for a flow book, which stores the fit and never reads it', 'flow', 'width'],
  ] as const)('%s', (_, layoutKind, fit) => {
    expect(defaultPageFit(layoutKind)).toBe(fit);
  });
});

describe('startingPlace', () => {
  it.each(['paged', 'continuous'] as const)('starts a %s book on its first image', (layoutKind) => {
    expect(startingPlace({ ...book, layoutKind })).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
  });

  it('starts a flowing book at the start of its text', () => {
    expect(
      startingPlace({
        ...book,
        layoutKind: 'flow',
        sourceKind: 'epub',
        position: textPlace('epubcfi(/6/14!/4/2/1:0)', 0.5),
      }),
    ).toEqual(START_OF_THE_TEXT);
  });
});
