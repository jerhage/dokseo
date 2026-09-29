import { describe, expect, it } from 'vitest';
import { imageRect } from './geometry';
import { bookId, imageIndex } from './ids';
import {
  IMAGE_PARAMETER,
  MISSING_BOOK_NOTICE,
  NO_ARRIVAL,
  REGION_TOLERANCE,
  arrivalQuery,
  captureHref,
  missingBookNotice,
  missingBookArrival,
  openingPlace,
  readArrival,
  readerHref,
  readerNavigation,
  passageHref,
  readImageIndex,
  readRegion,
  regionDistance,
  urlForShownPlace,
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

describe('urlForShownPlace', () => {
  const linked = 'https://r.test/read/one?image=3&region=10,20,92,104&find=%E7%8C%AB';

  function moved(index: number, group: readonly number[]) {
    return { kind: 'moved', index: imageIndex(index), group: group.map(imageIndex) } as const;
  }

  it('rewrites only the image on arrival and keeps the region and the search', () => {
    const shown = urlForShownPlace(new URL(linked), { kind: 'arrived', index: imageIndex(5) });

    expect(shown?.searchParams.get(IMAGE_PARAMETER)).toBe('5');
    expect(shown?.searchParams.get('region')).toBe('10,20,92,104');
    expect(shown?.searchParams.get('find')).toBe('猫');
  });

  it('reports nothing on arrival at the image the url already names', () => {
    const named = new URL('https://r.test/read/one?image=3&find=x');

    expect(urlForShownPlace(named, { kind: 'arrived', index: imageIndex(3) })).toBeNull();
  });

  it('drops the region and the search when a move shows a group without the named image', () => {
    const shown = urlForShownPlace(new URL(linked), moved(4, [4, 5]));

    expect(shown?.pathname).toBe('/read/one');
    expect(shown?.search).toBe('?image=4');
  });

  it('keeps every other parameter when a move drops the region', () => {
    const shown = urlForShownPlace(new URL(`${linked}&q=two`), moved(0, [0]));

    expect(shown?.search).toBe('?image=0&q=two');
  });

  it('leaves the url alone when a move shows a spread holding the named image', () => {
    expect(urlForShownPlace(new URL(linked), moved(2, [2, 3]))).toBeNull();
  });

  it('leaves the url alone when a move lands on the named image', () => {
    expect(urlForShownPlace(new URL(linked), moved(3, [3]))).toBeNull();
  });

  it('writes the image when a move lands in a url that names none', () => {
    const shown = urlForShownPlace(new URL('https://r.test/read/one?find=x'), moved(2, [2, 3]));

    expect(shown?.search).toBe('?image=2');
  });

  it('reports nothing when a move changes nothing in the url', () => {
    expect(urlForShownPlace(new URL('https://r.test/read/one?image=4'), moved(4, []))).toBeNull();
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

describe('captureHref', () => {
  const REGION = { index: imageIndex(7), rect: imageRect(12.3456, 0.004, 300, 88.125) };

  it('names the image and the region in image pixels to hundredths', () => {
    expect(captureHref(bookId('one'), REGION)).toBe('/read/one?image=7&region=12.35,0,300,88.13');
  });

  it('carries the search after the region', () => {
    expect(captureHref(bookId('one'), REGION, '海')).toBe(
      '/read/one?image=7&region=12.35,0,300,88.13&find=%E6%B5%B7',
    );
  });

  it('reads back as the same image, with the region within a hundredth of a pixel', () => {
    const found = readArrival(
      new URL(captureHref(bookId('one'), REGION, '海'), 'https://r.test').searchParams,
    );

    if (found.kind !== 'image' || found.region === null) throw new Error('no region read back');
    expect(found.index).toBe(REGION.index);
    expect(regionDistance(found.region, REGION.rect)).toBeLessThanOrEqual(REGION_TOLERANCE);
  });
});

describe('readRegion', () => {
  it('reads four comma separated coordinates', () => {
    expect(readRegion('0,1.25,2,3')).toEqual(imageRect(0, 1.25, 2, 3));
  });

  it('treats a malformed region as absent', () => {
    expect(readRegion(null)).toBeNull();
    expect(readRegion('')).toBeNull();
    expect(readRegion('1,2,3')).toBeNull();
    expect(readRegion('1,2,3,4,5')).toBeNull();
    expect(readRegion('1,2,-3,4')).toBeNull();
    expect(readRegion('1,2,x,4')).toBeNull();
    expect(readRegion('1,2,1e3,4')).toBeNull();
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
    ).toEqual({ kind: 'image', index: imageIndex(1), region: null, query: '海' });
  });

  it('reads an image named without a search or a region', () => {
    expect(readArrival(new URL('https://r.test/read/one?image=4').searchParams)).toEqual({
      kind: 'image',
      index: imageIndex(4),
      region: null,
      query: null,
    });
  });

  it('reads the region a capture link names beside its image', () => {
    expect(
      readArrival(
        new URL('https://r.test/read/one?image=4&region=1.5,2,30.25,40&find=a').searchParams,
      ),
    ).toEqual({
      kind: 'image',
      index: imageIndex(4),
      region: imageRect(1.5, 2, 30.25, 40),
      query: 'a',
    });
  });

  it('ignores a capture id an old link still carries, and names no region', () => {
    expect(
      readArrival(
        new URL('https://r.test/read/one?image=2&find=%E6%B5%B7&capture=c1').searchParams,
      ),
    ).toEqual({ kind: 'image', index: imageIndex(2), region: null, query: '海' });
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
      region: null,
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
    expect(arrivalQuery({ kind: 'image', index: imageIndex(0), region: null, query: '山' })).toBe(
      '山',
    );
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

describe('readerNavigation', () => {
  const one = bookId('one');
  const two = bookId('two');

  it('enters the first book asked for, at the image the url names', () => {
    expect(readerNavigation(null, { book: one, image: imageIndex(3) })).toEqual({
      kind: 'enter',
      book: one,
      image: 3,
    });
  });

  it('enters with no image when the url names none', () => {
    expect(readerNavigation(null, { book: one, image: null })).toEqual({
      kind: 'enter',
      book: one,
      image: null,
    });
  });

  it('switches to another book, carrying its image', () => {
    const before = { book: one, image: imageIndex(3) };
    expect(readerNavigation(before, { book: two, image: imageIndex(3) })).toEqual({
      kind: 'switch',
      book: two,
      image: 3,
    });
  });

  it('goes to a new image in the same book', () => {
    const before = { book: one, image: imageIndex(3) };
    expect(readerNavigation(before, { book: one, image: imageIndex(7) })).toEqual({
      kind: 'go-to-image',
      book: one,
      image: 7,
    });
  });

  it('goes to an image the url names for the first time', () => {
    const before = { book: one, image: null };
    expect(readerNavigation(before, { book: one, image: imageIndex(0) })).toEqual({
      kind: 'go-to-image',
      book: one,
      image: 0,
    });
  });

  it('stays when the same book keeps the same image', () => {
    const before = { book: one, image: imageIndex(3) };
    expect(readerNavigation(before, { book: one, image: imageIndex(3) })).toEqual({
      kind: 'stay',
    });
  });

  it('stays when the url stops naming an image', () => {
    const before = { book: one, image: imageIndex(3) };
    expect(readerNavigation(before, { book: one, image: null })).toEqual({ kind: 'stay' });
  });
});
