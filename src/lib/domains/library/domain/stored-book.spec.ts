import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { PAGE_PAIRINGS } from '$lib/shared/layout-kind';
import type { Book } from './book';
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
    expect(bookFromStored(legacy).pagePairing).toBe('single');
  });

  it('keeps a stored pairing that is present', () => {
    for (const pairing of PAGE_PAIRINGS) {
      expect(bookFromStored({ ...legacy, pagePairing: pairing }).pagePairing).toBe(pairing);
    }
    expect(PAGE_PAIRINGS).toEqual(['single', 'double', 'double-after-cover']);
  });

  it('leaves every other field exactly as stored', () => {
    const expected: Book = { ...legacy, pagePairing: 'single' };
    expect(bookFromStored(legacy)).toEqual(expected);
  });

  it('returns a new object and leaves the stored record untouched', () => {
    const stored: StoredBook = { ...legacy };
    const book = bookFromStored(stored);
    expect(book).not.toBe(stored);
    expect(Object.hasOwn(stored, 'pagePairing')).toBe(false);
  });
});
