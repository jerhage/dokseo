import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from './ids';
import {
  IMAGE_PARAMETER,
  MISSING_BOOK_NOTICE,
  NO_ARRIVAL,
  arrivalQuery,
  missingBookNotice,
  missingBookArrival,
  openingPlace,
  readArrival,
  readerHref,
  passageHref,
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

  it('carries the search beside the image and names no capture', () => {
    expect(readerHref(bookId('one'), imageIndex(13), '海が')).toBe(
      '/read/one?image=13&find=%E6%B5%B7%E3%81%8C',
    );
  });

  it('names only the image when no search was carried', () => {
    expect(readerHref(bookId('one'), imageIndex(13), null)).toBe('/read/one?image=13');
  });

  it('drops a search of only spaces', () => {
    expect(readerHref(bookId('one'), imageIndex(1), '  ')).toBe('/read/one?image=1');
  });
});

describe('passageHref', () => {
  const CFI = 'epubcfi(/6/4!/4/2,/1:0,/1:5)';

  it('names the book and the passage by its cfi, with no image and no capture', () => {
    expect(passageHref(bookId('one'), CFI)).toBe(
      '/read/one?cfi=epubcfi(%2F6%2F4!%2F4%2F2%2C%2F1%3A0%2C%2F1%3A5)',
    );
  });

  it('carries the search after the cfi', () => {
    expect(passageHref(bookId('a/b'), CFI, '海')).toBe(
      '/read/a%2Fb?cfi=epubcfi(%2F6%2F4!%2F4%2F2%2C%2F1%3A0%2C%2F1%3A5)&find=%E6%B5%B7',
    );
  });

  it('opens the bare book for an empty cfi', () => {
    expect(passageHref(bookId('one'), '', '海')).toBe('/read/one');
  });

  it('reads back as the same passage arrival', () => {
    const href = passageHref(bookId('one'), CFI, '海が');

    expect(readArrival(new URL(href, 'https://r.test').searchParams)).toEqual({
      kind: 'passage',
      cfi: CFI,
      query: '海が',
    });
  });
});

describe('readArrival', () => {
  it('reads the image and the search back out of a url', () => {
    expect(
      readArrival(new URL('https://r.test/read/one?image=1&find=%E6%B5%B7').searchParams),
    ).toEqual({ kind: 'image', index: imageIndex(1), query: '海' });
  });

  it('reads an image named without a search', () => {
    expect(readArrival(new URL('https://r.test/read/one?image=4').searchParams)).toEqual({
      kind: 'image',
      index: imageIndex(4),
      query: null,
    });
  });

  it('ignores a capture id an old link still carries', () => {
    expect(
      readArrival(
        new URL('https://r.test/read/one?image=2&find=%E6%B5%B7&capture=c1').searchParams,
      ),
    ).toEqual({ kind: 'image', index: imageIndex(2), query: '海' });
  });

  it('reports no arrival for an old link naming only a capture', () => {
    expect(readArrival(new URL('https://r.test/read/one?capture=c1').searchParams)).toEqual(
      NO_ARRIVAL,
    );
  });

  it('reports no arrival when only the search is named', () => {
    expect(readArrival(new URL('https://r.test/read/one?find=%E6%B5%B7').searchParams)).toEqual(
      NO_ARRIVAL,
    );
  });

  it('drops a search of only spaces and keeps the image', () => {
    expect(readArrival(new URL('https://r.test/read/one?find=%20&image=3').searchParams)).toEqual({
      kind: 'image',
      index: imageIndex(3),
      query: null,
    });
  });

  it('prefers the passage when a url names both a cfi and an image', () => {
    expect(
      readArrival(new URL('https://r.test/read/one?image=3&cfi=epubcfi(%2F6%2F2)').searchParams),
    ).toEqual({ kind: 'passage', cfi: 'epubcfi(/6/2)', query: null });
  });

  it('reports no arrival for an empty cfi and no image', () => {
    expect(readArrival(new URL('https://r.test/read/one?cfi=').searchParams)).toEqual(NO_ARRIVAL);
  });
});

describe('arrivalQuery', () => {
  it('gives the search an arrival carries', () => {
    expect(arrivalQuery({ kind: 'passage', cfi: 'epubcfi(/6/2)', query: '海' })).toBe('海');
    expect(arrivalQuery({ kind: 'image', index: imageIndex(0), query: '山' })).toBe('山');
  });

  it('gives no search when there is no arrival', () => {
    expect(arrivalQuery(NO_ARRIVAL)).toBeNull();
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

describe('missingBookArrival', () => {
  it('explains the missing book and drops only its parameter from the address', () => {
    const arrival = missingBookArrival(new URL('https://r.test/?missing=book&shelf=reading#top'));

    expect(arrival?.notice).toBe(MISSING_BOOK_NOTICE);
    expect(arrival?.cleaned.href).toBe('https://r.test/?shelf=reading#top');
  });

  it('answers nothing for an address without the missing-book parameter', () => {
    expect(missingBookArrival(new URL('https://r.test/'))).toBeNull();
    expect(missingBookArrival(new URL('https://r.test/?missing=page'))).toBeNull();
  });
});
