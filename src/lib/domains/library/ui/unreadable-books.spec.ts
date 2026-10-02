import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { unreadableBookName, unreadableBooksTitle } from './unreadable-books';

describe('unreadableBooksTitle', () => {
  it.each([
    [1, '1 book could not be read'],
    [2, '2 books could not be read'],
  ])('names %i unreadable books', (count, title) => {
    expect(unreadableBooksTitle(count)).toBe(title);
  });
});

describe('unreadableBookName', () => {
  it('names the book by its stored title', () => {
    expect(unreadableBookName({ id: bookId('b-1'), title: 'Yotsuba&! 2', alias: null })).toBe(
      'Yotsuba&! 2',
    );
  });

  it('names a renamed book by its alias, then its original title', () => {
    expect(unreadableBookName({ id: bookId('b-1'), title: 'Yotsuba&! 2', alias: 'Mine' })).toBe(
      'Mine (originally Yotsuba&! 2)',
    );
  });

  it.each([null, '  '])('names a renamed book without a title %j by its alias', (title) => {
    expect(unreadableBookName({ id: bookId('b-1'), title, alias: 'Mine' })).toBe('Mine');
  });

  it.each([null, '  '])('names a book without a title %j by a short id', (title) => {
    expect(unreadableBookName({ id: bookId('0123456789abcdef'), title, alias: null })).toBe(
      'Untitled book (01234567)',
    );
  });
});
