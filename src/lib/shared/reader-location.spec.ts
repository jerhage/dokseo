import { describe, expect, it } from 'vitest';
import { imageIndex } from './ids';
import {
  IMAGE_PARAMETER,
  MISSING_BOOK_NOTICE,
  missingBookNotice,
  openingPlace,
  readImageIndex,
  urlWithImageIndex,
} from './reader-location';

describe('readImageIndex', () => {
  it('reads a whole number as an image index', () => {
    expect(readImageIndex('0')).toBe(0);
    expect(readImageIndex('41')).toBe(41);
    expect(readImageIndex(' 7 ')).toBe(7);
  });

  it('treats a missing parameter as absent', () => {
    expect(readImageIndex(null)).toBeNull();
    expect(readImageIndex(undefined)).toBeNull();
    expect(readImageIndex('')).toBeNull();
  });

  it('treats a value that is not a number as absent', () => {
    expect(readImageIndex('seven')).toBeNull();
    expect(readImageIndex('1.5')).toBeNull();
    expect(readImageIndex('1e3')).toBeNull();
    expect(readImageIndex('0x10')).toBeNull();
  });

  it('treats a negative value as absent', () => {
    expect(readImageIndex('-1')).toBeNull();
  });

  it('treats a number beyond safe integers as absent', () => {
    expect(readImageIndex('9007199254740993')).toBeNull();
  });
});

describe('openingPlace', () => {
  it('opens at the saved place when the url asks for nothing', () => {
    expect(openingPlace(null, imageIndex(12), 40)).toEqual({
      index: 12,
      asked: false,
      clamped: false,
    });
  });

  it('prefers the url over the saved place', () => {
    expect(openingPlace(imageIndex(3), imageIndex(12), 40)).toEqual({
      index: 3,
      asked: true,
      clamped: false,
    });
  });

  it('clamps an index past the end to the last image', () => {
    expect(openingPlace(imageIndex(99), imageIndex(12), 40)).toEqual({
      index: 39,
      asked: true,
      clamped: true,
    });
  });

  it('clamps a saved place past the end without calling it a url clamp', () => {
    expect(openingPlace(null, imageIndex(99), 40)).toEqual({
      index: 39,
      asked: false,
      clamped: false,
    });
  });

  it('reports no place for a book holding no images', () => {
    expect(openingPlace(imageIndex(2), imageIndex(0), 0)).toBeNull();
  });
});

describe('urlWithImageIndex', () => {
  it('writes the index into the query and keeps the rest', () => {
    const moved = urlWithImageIndex(new URL('https://r.test/read/one?q=two'), imageIndex(5));

    expect(moved?.pathname).toBe('/read/one');
    expect(moved?.searchParams.get('q')).toBe('two');
    expect(moved?.searchParams.get(IMAGE_PARAMETER)).toBe('5');
  });

  it('reports nothing when the url already names that index', () => {
    expect(urlWithImageIndex(new URL('https://r.test/read/one?image=5'), imageIndex(5))).toBeNull();
  });
});

describe('missingBookNotice', () => {
  it('explains a book that is no longer in the library', () => {
    expect(missingBookNotice('book')).toBe(MISSING_BOOK_NOTICE);
  });

  it('says nothing for any other value', () => {
    expect(missingBookNotice(null)).toBeNull();
    expect(missingBookNotice('anything else')).toBeNull();
  });
});
