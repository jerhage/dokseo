import { describe, expect, it } from 'vitest';
import { removedBookFrom, removedBooksFrom } from './removed-book';

describe('removedBookFrom', () => {
  it('reads the title, alias, hash, file name, language, direction and added time a row holds', () => {
    expect(
      removedBookFrom({
        id: 'book-1',
        title: 'Yotsuba&! 1',
        alias: 'Mine',
        contentHash: '9f86d081',
        fileName: 'Yotsuba&! 1.cbz',
        language: 'ko',
        direction: 'ltr',
        addedAt: 5,
      }),
    ).toEqual({
      id: 'book-1',
      title: 'Yotsuba&! 1',
      alias: 'Mine',
      seriesId: null,
      volume: null,
      contentHash: '9f86d081',
      fileName: 'Yotsuba&! 1.cbz',
      language: 'ko',
      direction: 'ltr',
      addedAt: 5,
    });
  });

  it('falls back field by field for a row that lacks them', () => {
    expect(removedBookFrom({ id: 'book-1', title: '  ', contentHash: 7 })).toEqual({
      id: 'book-1',
      title: 'Untitled book',
      alias: null,
      seriesId: null,
      volume: null,
      contentHash: '',
      fileName: '',
      language: 'ja',
      direction: 'rtl',
      addedAt: null,
    });
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['blank', '  '],
    ['not text', 7],
  ])('keeps no alias when the row holds one that is %s', (_, alias) => {
    expect(removedBookFrom({ id: 'book-1', title: 'x', alias })?.alias).toBeNull();
  });

  it('keeps the series id and volume a row holds', () => {
    expect(
      removedBookFrom({ id: 'book-1', title: 'x', seriesId: 'series-1', volume: 2.5 }),
    ).toMatchObject({ seriesId: 'series-1', volume: 2.5 });
  });

  it.each([
    ['absent', undefined, undefined],
    ['null', null, null],
    ['of the wrong type', 7, '2'],
  ])('reads a series id and volume that are %s as null', (_, seriesId, volume) => {
    expect(removedBookFrom({ id: 'book-1', title: 'x', seriesId, volume })).toMatchObject({
      seriesId: null,
      volume: null,
    });
  });

  it('reads a volume that is not finite as null', () => {
    expect(removedBookFrom({ id: 'book-1', title: 'x', volume: Number.NaN })?.volume).toBeNull();
  });

  it('stores the direction a continuous book reads in, not the one it was set to', () => {
    expect(
      removedBookFrom({ id: 'book-1', direction: 'rtl', layoutKind: 'continuous' })?.direction,
    ).toBe('ltr');
  });

  it('answers null for a row with no usable id', () => {
    expect(removedBookFrom({ id: '../escape', title: 'x' })).toBeNull();
    expect(removedBookFrom({ title: 'x' })).toBeNull();
  });
});

describe('removedBooksFrom', () => {
  it('drops a row with no usable id and keeps the rest', () => {
    expect(removedBooksFrom([{ id: 7 }, { id: 'book-2' }]).map((book) => book.id)).toEqual([
      'book-2',
    ]);
  });
});
