import { describe, expect, it } from 'vitest';
import { bookId, parsedBookId } from './ids';

describe('parsedBookId', () => {
  it.each([
    ['the id a new book is given', '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b'],
    ['a flat name with dots and dashes inside it', 'a.b-c'],
  ])('passes %s', (_name, id) => {
    expect(parsedBookId(id)).toBe(bookId(id));
  });

  it.each([
    ['the empty string', ''],
    ['a name holding a forward slash', 'a/b'],
    ['a name holding a backslash', 'a\\b'],
    ['a name holding two dots in a row', 'a..b'],
    ['two dots alone', '..'],
  ])('rejects %s', (_name, id) => {
    expect(parsedBookId(id)).toBeNull();
  });
});
