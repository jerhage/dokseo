import { describe, expect, it } from 'vitest';
import { bookId, parsedBookId } from './ids';

describe('parsedBookId', () => {
  it('passes the id a new book is given', () => {
    const minted = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

    expect(parsedBookId(minted)).toBe(bookId(minted));
  });

  it('passes a flat name with dots and dashes inside it', () => {
    expect(parsedBookId('a.b-c')).toBe(bookId('a.b-c'));
  });

  it('rejects the empty string', () => {
    expect(parsedBookId('')).toBeNull();
  });

  it('rejects a name holding a forward slash', () => {
    expect(parsedBookId('a/b')).toBeNull();
  });

  it('rejects a name holding a backslash', () => {
    expect(parsedBookId('a\\b')).toBeNull();
  });

  it('rejects a name holding two dots in a row', () => {
    expect(parsedBookId('a..b')).toBeNull();
    expect(parsedBookId('..')).toBeNull();
  });
});
