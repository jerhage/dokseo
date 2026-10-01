import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { PAGE_PAIRINGS } from '$lib/shared/layout-kind';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';
import { CorruptRow } from '$lib/shared/corrupt-row';
import {
  bookFromStored,
  FALLBACK_DIRECTION,
  FALLBACK_LANGUAGE,
  NO_CONTENT_HASH,
  NO_FILE_NAME,
} from './stored-book';
import type { StoredBook } from './stored-book';

const legacy: StoredBook = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  sourceKind: 'archive',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imageIndex(3),
};

describe('bookFromStored', () => {
  it('fills the default pairing when the stored record lacks one', () => {
    expect(bookFromStored(legacy).pagePairing).toBe(DEFAULT_PAGE_PAIRING);
  });

  it('keeps a stored pairing that is present', () => {
    for (const pairing of PAGE_PAIRINGS) {
      expect(bookFromStored({ ...legacy, pagePairing: pairing }).pagePairing).toBe(pairing);
    }
    expect(PAGE_PAIRINGS).toEqual(['single', 'double', 'double-after-cover']);
  });

  it('fills the fit from the layout kind when the stored record lacks one', () => {
    expect(bookFromStored(legacy).pageFit).toBe('height');
    expect(bookFromStored({ ...legacy, layoutKind: 'continuous' }).pageFit).toBe('width');
  });

  it('keeps a stored fit that is present', () => {
    expect(bookFromStored({ ...legacy, pageFit: 'width' }).pageFit).toBe('width');
    expect(bookFromStored({ ...legacy, layoutKind: 'continuous', pageFit: 'height' }).pageFit).toBe(
      'height',
    );
  });

  it('reads a stored number as the image it names', () => {
    expect(bookFromStored(legacy).position).toEqual({
      kind: 'image',
      index: 3,
      shownThrough: 3,
      offset: 0,
    });
  });

  it('reads a stored image place back whole', () => {
    const stored: StoredBook = { ...legacy, position: imagePlace(imageIndex(12)) };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 12,
      shownThrough: 12,
      offset: 0,
    });
  });

  it('reads a stored image place back with the last image it showed', () => {
    const stored: StoredBook = { ...legacy, position: imagePlace(imageIndex(3), imageIndex(4)) };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 3,
      shownThrough: 4,
      offset: 0,
    });
  });

  it('reads an image place stored before the last shown image as showing its own image', () => {
    const stored: StoredBook = { ...legacy, position: { kind: 'image', index: imageIndex(12) } };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 12,
      shownThrough: 12,
      offset: 0,
    });
  });

  it('reads a stored image place back with the fraction down the image it was left at', () => {
    const stored: StoredBook = {
      ...legacy,
      position: imagePlace(imageIndex(3), imageIndex(4), 0.35),
    };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 3,
      shownThrough: 4,
      offset: 0.35,
    });
  });

  it('reads an image place stored before the offset as the top of its image', () => {
    const stored: StoredBook = {
      ...legacy,
      position: { kind: 'image', index: imageIndex(12), shownThrough: imageIndex(13) },
    };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 12,
      shownThrough: 13,
      offset: 0,
    });
  });

  it('reads a stored offset outside the image back inside it', () => {
    const stored: StoredBook = {
      ...legacy,
      position: { kind: 'image', index: imageIndex(12), shownThrough: imageIndex(12), offset: 7 },
    };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'image',
      index: 12,
      shownThrough: 12,
      offset: 1,
    });
  });

  it('reads a stored text place back whole', () => {
    const stored: StoredBook = {
      ...legacy,
      position: textPlace('epubcfi(/6/14!/4/2/14/1:0)', null),
    };
    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: null,
    });
  });

  it('reads a text place written before fractions as holding no fraction', () => {
    const stored: StoredBook = {
      ...legacy,
      layoutKind: 'flow',
      sourceKind: 'epub',
      imageCount: 0,
      position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)' },
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: null,
    });
  });

  it('keeps a stored fraction that is present', () => {
    const stored: StoredBook = {
      ...legacy,
      position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: 0.37 },
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: 0.37,
    });
  });

  it('reads a stored fraction the book could never have reached as no fraction', () => {
    const stored: StoredBook = {
      ...legacy,
      position: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/14/1:0)', fraction: Number.NaN },
    };

    expect(bookFromStored(stored).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
      fraction: null,
    });
  });

  it('reads the first image rather than treating the stored zero as absent', () => {
    expect(bookFromStored({ ...legacy, position: imageIndex(0) }).position).toEqual({
      kind: 'image',
      index: 0,
      shownThrough: 0,
      offset: 0,
    });
  });

  it('reads a record written before fingerprints as holding no content hash', () => {
    expect(bookFromStored(legacy).contentHash).toBe(NO_CONTENT_HASH);
  });

  it('gives a record written before fingerprints a hash no file can be given', () => {
    expect(NO_CONTENT_HASH).toBe('');
  });

  it('keeps a stored content hash that is present', () => {
    const stored: StoredBook = { ...legacy, contentHash: contentHash('9f86d081') };

    expect(bookFromStored(stored).contentHash).toBe('9f86d081');
  });

  it('reads a record stored before file names with no file name', () => {
    expect(bookFromStored(legacy).fileName).toBe(NO_FILE_NAME);
    expect(NO_FILE_NAME).toBe('');
  });

  it('keeps a stored file name that is present', () => {
    expect(bookFromStored({ ...legacy, fileName: 'Yotsuba&! 1.cbz' }).fileName).toBe(
      'Yotsuba&! 1.cbz',
    );
  });

  it('leaves every other field exactly as stored', () => {
    const expected: Book = {
      ...legacy,
      language: 'ja',
      layoutKind: 'paged',
      direction: 'rtl',
      sourceKind: 'archive',
      pagePairing: DEFAULT_PAGE_PAIRING,
      pageFit: defaultPageFit('paged'),
      position: imagePlace(imageIndex(3)),
      contentHash: NO_CONTENT_HASH,
      fileName: NO_FILE_NAME,
      lastReadAt: null,
      finishedAt: null,
    };
    expect(bookFromStored(legacy)).toEqual(expected);
  });

  it('reads a record written before reading times as never read and not marked finished', () => {
    const book = bookFromStored(legacy);

    expect(book.lastReadAt).toBeNull();
    expect(book.finishedAt).toBeNull();
  });

  it('reads a stored null reading time as null', () => {
    const book = bookFromStored({ ...legacy, lastReadAt: null, finishedAt: null });

    expect(book.lastReadAt).toBeNull();
    expect(book.finishedAt).toBeNull();
  });

  it('keeps stored reading times that are present', () => {
    const book = bookFromStored({
      ...legacy,
      lastReadAt: 1758300000000,
      finishedAt: 1758400000000,
    });

    expect(book.lastReadAt).toBe(1758300000000);
    expect(book.finishedAt).toBe(1758400000000);
  });

  it('returns a new object and leaves the stored record untouched', () => {
    const stored: StoredBook = { ...legacy };
    const book = bookFromStored(stored);
    expect(book).not.toBe(stored);
    expect(Object.hasOwn(stored, 'pagePairing')).toBe(false);
    expect(Object.hasOwn(stored, 'pageFit')).toBe(false);
  });

  it('keeps every stored language, layout kind, direction and source kind it knows', () => {
    const book = bookFromStored({
      ...legacy,
      language: 'ko',
      layoutKind: 'flow',
      direction: 'ltr',
      sourceKind: 'epub',
    });

    expect([book.language, book.layoutKind, book.direction, book.sourceKind]).toEqual([
      'ko',
      'flow',
      'ltr',
      'epub',
    ]);
  });

  it('falls back to the first language for a stored language it does not know', () => {
    expect(bookFromStored({ ...legacy, language: 'xx' }).language).toBe(FALLBACK_LANGUAGE);
    expect(FALLBACK_LANGUAGE).toBe('ja');
  });

  it('falls back to right to left for a stored direction it does not know', () => {
    expect(bookFromStored({ ...legacy, direction: 'down' }).direction).toBe(FALLBACK_DIRECTION);
    expect(FALLBACK_DIRECTION).toBe('rtl');
  });

  it('falls back to the default pairing for a stored pairing it does not know', () => {
    expect(bookFromStored({ ...legacy, pagePairing: 'triple' }).pagePairing).toBe(
      DEFAULT_PAGE_PAIRING,
    );
  });

  it('falls back to the fit of the layout kind for a stored fit it does not know', () => {
    expect(bookFromStored({ ...legacy, layoutKind: 'continuous', pageFit: 7 }).pageFit).toBe(
      'width',
    );
  });

  it('throws a corrupt row for a stored layout kind it does not know', () => {
    expect(() => bookFromStored({ ...legacy, layoutKind: 'scroll' })).toThrow(CorruptRow);
    expect(() => bookFromStored({ ...legacy, layoutKind: 'scroll' })).toThrow(
      'A stored book holds an unknown layout kind: scroll',
    );
  });

  it('throws a corrupt row for a stored source kind it does not know', () => {
    expect(() => bookFromStored({ ...legacy, sourceKind: 'mobi' })).toThrow(
      'A stored book holds an unknown source kind: mobi',
    );
  });
});
