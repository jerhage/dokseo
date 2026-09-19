import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { SOURCE_KINDS, isSourceKind, withPosition, type Book } from './book';

const book: Book = {
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

describe('withPosition', () => {
  it('returns a new object', () => {
    expect(withPosition(book, imageIndex(7))).not.toBe(book);
  });

  it('leaves the original untouched', () => {
    withPosition(book, imageIndex(7));
    expect(book.position).toBe(3);
  });

  it('moves the position to the given index', () => {
    expect(withPosition(book, imageIndex(7)).position).toBe(7);
  });

  it('preserves every other field', () => {
    expect(withPosition(book, imageIndex(7))).toEqual({ ...book, position: 7 });
  });

  it('accepts the first index', () => {
    expect(withPosition(book, imageIndex(0)).position).toBe(0);
  });
});

describe('isSourceKind', () => {
  it('accepts every declared source kind', () => {
    expect(SOURCE_KINDS.every(isSourceKind)).toBe(true);
    expect(SOURCE_KINDS).toEqual(['images', 'pdf', 'archive']);
  });

  it('rejects an unknown string', () => {
    expect(isSourceKind('video')).toBe(false);
    expect(isSourceKind('')).toBe(false);
    expect(isSourceKind('Images')).toBe(false);
  });

  it('rejects a value that is not a string', () => {
    expect(isSourceKind(undefined)).toBe(false);
    expect(isSourceKind(null)).toBe(false);
    expect(isSourceKind(0)).toBe(false);
    expect(isSourceKind(['pdf'])).toBe(false);
  });
});
