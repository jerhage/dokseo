import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { PAGE_PAIRINGS } from '$lib/shared/layout-kind';
import { defaultPageFit, DEFAULT_PAGE_PAIRING, type Book } from './book';
import { bookFromStored, type StoredBook } from './stored-book';

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

  it('leaves every other field exactly as stored', () => {
    const expected: Book = {
      ...legacy,
      pagePairing: DEFAULT_PAGE_PAIRING,
      pageFit: defaultPageFit(legacy.layoutKind),
    };
    expect(bookFromStored(legacy)).toEqual(expected);
  });

  it('returns a new object and leaves the stored record untouched', () => {
    const stored: StoredBook = { ...legacy };
    const book = bookFromStored(stored);
    expect(book).not.toBe(stored);
    expect(Object.hasOwn(stored, 'pagePairing')).toBe(false);
    expect(Object.hasOwn(stored, 'pageFit')).toBe(false);
  });
});
