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
