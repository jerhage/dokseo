import { describe, expect, it } from 'vitest';
import { bookId, captureId, imageIndex } from './ids';
import {
  IMAGE_PARAMETER,
  MISSING_BOOK_NOTICE,
  missingBookNotice,
  openingPlace,
  readArrival,
  readerHref,
  readImageIndex,
  urlWithImageIndex,
} from './reader-location';
import { imagePlace, textPlace } from './reading-place';

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
    expect(openingPlace(null, imagePlace(imageIndex(12)), 40)).toEqual({
      index: 12,
      asked: false,
      clamped: false,
    });
  });

  it('prefers the url over the saved place', () => {
    expect(openingPlace(imageIndex(3), imagePlace(imageIndex(12)), 40)).toEqual({
      index: 3,
      asked: true,
      clamped: false,
    });
  });

  it('clamps an index past the end to the last image', () => {
    expect(openingPlace(imageIndex(99), imagePlace(imageIndex(12)), 40)).toEqual({
      index: 39,
      asked: true,
      clamped: true,
    });
  });

  it('clamps a saved place past the end without calling it a url clamp', () => {
    expect(openingPlace(null, imagePlace(imageIndex(99)), 40)).toEqual({
      index: 39,
      asked: false,
      clamped: false,
    });
  });

  it('reports no place for a book holding no images', () => {
    expect(openingPlace(imageIndex(2), imagePlace(imageIndex(0)), 0)).toBeNull();
  });

  it('reports no place when the book stopped at a text place and the url asks for nothing', () => {
    expect(openingPlace(null, textPlace('epubcfi(/6/14!/4/2/14/1:0)', null), 40)).toBeNull();
  });

  it('opens at the url when the book stopped at a text place', () => {
    expect(openingPlace(imageIndex(3), textPlace('epubcfi(/6/14!/4/2/14/1:0)', null), 40)).toEqual({
      index: 3,
      asked: true,
      clamped: false,
    });
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

describe('readerHref', () => {
  it('names the book and the image index', () => {
    expect(readerHref(bookId('one'), imageIndex(13))).toBe('/read/one?image=13');
  });

  it('escapes a book id that would otherwise change the path', () => {
    expect(readerHref(bookId('a/b?c'), imageIndex(0))).toBe('/read/a%2Fb%3Fc?image=0');
  });

  it('carries the search and the capture that was reached', () => {
    expect(
      readerHref(bookId('one'), imageIndex(13), { capture: captureId('c1'), query: '海が' }),
    ).toBe('/read/one?image=13&find=%E6%B5%B7%E3%81%8C&capture=c1');
  });

  it('carries a capture reached without a search', () => {
    expect(
      readerHref(bookId('one'), imageIndex(13), { capture: captureId('c1'), query: null }),
    ).toBe('/read/one?image=13&capture=c1');
  });

  it('keeps the capture when the query is only spaces', () => {
    expect(
      readerHref(bookId('one'), imageIndex(1), { capture: captureId('c1'), query: '  ' }),
    ).toBe('/read/one?image=1&capture=c1');
  });
});

describe('readArrival', () => {
  it('reads the search and the capture back out of a url', () => {
    const arrival = readArrival(
      new URL('https://r.test/read/one?image=1&find=%E6%B5%B7&capture=c1').searchParams,
    );
    expect(arrival).toEqual({ capture: captureId('c1'), query: '海' });
  });

  it('reports nothing when only the search is named', () => {
    expect(readArrival(new URL('https://r.test/read/one?find=%E6%B5%B7').searchParams)).toBeNull();
  });

  it('reads a capture named without a search', () => {
    expect(readArrival(new URL('https://r.test/read/one?capture=c1').searchParams)).toEqual({
      capture: captureId('c1'),
      query: null,
    });
  });

  it('drops a search of only spaces and keeps the capture', () => {
    expect(
      readArrival(new URL('https://r.test/read/one?find=%20&capture=c1').searchParams),
    ).toEqual({ capture: captureId('c1'), query: null });
  });

  it('reports nothing when the capture is empty', () => {
    expect(
      readArrival(new URL('https://r.test/read/one?find=%E6%B5%B7&capture=').searchParams),
    ).toBeNull();
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
