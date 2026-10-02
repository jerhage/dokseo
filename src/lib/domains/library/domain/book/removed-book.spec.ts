import { describe, expect, it } from 'vitest';
import { removedBookFrom, removedBooksFrom } from './removed-book';

describe('removedBookFrom', () => {
  it('reads the title, hash, file name, language and direction a row holds', () => {
    expect(
      removedBookFrom({
        id: 'book-1',
        title: 'Yotsuba&! 1',
        contentHash: '9f86d081',
        fileName: 'Yotsuba&! 1.cbz',
        language: 'ko',
        direction: 'ltr',
      }),
    ).toEqual({
      id: 'book-1',
      title: 'Yotsuba&! 1',
      contentHash: '9f86d081',
      fileName: 'Yotsuba&! 1.cbz',
      language: 'ko',
      direction: 'ltr',
    });
  });

  it('falls back field by field for a row that lacks them', () => {
    expect(removedBookFrom({ id: 'book-1', title: '  ', contentHash: 7 })).toEqual({
      id: 'book-1',
      title: 'Untitled book',
      contentHash: '',
      fileName: '',
      language: 'ja',
      direction: 'rtl',
    });
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
