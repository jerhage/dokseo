import { describe, expect, it } from 'vitest';
import {
  bookId,
  catalogId,
  contentHash,
  newCatalogId,
  parsedBookId,
  parsedCatalogId,
  parsedContentHash,
} from './ids';

describe('newCatalogId', () => {
  it('mints a distinct UUID each time', () => {
    const first = newCatalogId();
    const second = newCatalogId();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u);
    expect(second).not.toBe(first);
  });
});

describe('parsedCatalogId', () => {
  it('passes the id a new catalog is given', () => {
    const id = newCatalogId();

    expect(parsedCatalogId(id)).toBe(catalogId(id));
  });

  it.each([
    ['the empty string', ''],
    ['a name holding a forward slash', 'a/b'],
    ['a name holding a backslash', 'a\\b'],
    ['a name holding two dots in a row', 'a..b'],
  ])('rejects %s', (_name, id) => {
    expect(parsedCatalogId(id)).toBeNull();
  });
});

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

describe('parsedContentHash', () => {
  it('passes a partial MD5 digest of 32 lowercase hex characters', () => {
    const digest = '9f86d081884c7d659a2feaa0c55ad015';

    expect(parsedContentHash(digest)).toBe(contentHash(digest));
  });

  it.each([
    ['the empty string', ''],
    ['a SHA-256 digest', 'a'.repeat(64)],
    ['a short digest', '9f86d081'],
    ['an uppercase digest', '9F86D081884C7D659A2FEAA0C55AD015'],
    ['a digest with a space', ' 9f86d081884c7d659a2feaa0c55ad01'],
    ['32 characters that are not hex', 'g'.repeat(32)],
  ])('rejects %s', (_name, raw) => {
    expect(parsedContentHash(raw)).toBeNull();
  });
});
