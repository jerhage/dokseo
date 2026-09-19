import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { applyEdit, defaultPageFit, type Book } from './book';

const book: Book = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'double',
  pageFit: 'height',
  sourceKind: 'archive',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imageIndex(3),
};

describe('applyEdit', () => {
  it('moves the position to the given index', () => {
    expect(applyEdit(book, { position: imageIndex(7) }).position).toBe(7);
  });

  it('accepts the first index', () => {
    expect(applyEdit(book, { position: imageIndex(0) }).position).toBe(0);
  });

  it('preserves every other field when it moves the position', () => {
    expect(applyEdit(book, { position: imageIndex(7) })).toEqual({ ...book, position: 7 });
  });

  it('replaces only the named fields and leaves the rest alone', () => {
    expect(applyEdit(book, { title: 'Blame! 1', language: 'ko' })).toEqual({
      ...book,
      title: 'Blame! 1',
      language: 'ko',
    });
  });

  it('returns a new object and leaves the original untouched', () => {
    const edited = applyEdit(book, { title: 'Blame! 1', position: imageIndex(7) });
    expect(edited).not.toBe(book);
    expect(book.title).toBe('Yotsuba&! 1');
    expect(book.position).toBe(3);
  });

  it('forces the direction to ltr when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous', direction: 'rtl' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.direction).toBe('ltr');
  });

  it('forces the direction to ltr when the book is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous' };
    expect(applyEdit(webtoon, { direction: 'rtl' }).direction).toBe('ltr');
    expect(applyEdit(webtoon, { title: 'Tower of God' }).direction).toBe('ltr');
  });

  it('keeps right to left on a paged book', () => {
    expect(applyEdit(book, { direction: 'rtl' }).direction).toBe('rtl');
    expect(applyEdit(book, { layoutKind: 'paged' }).direction).toBe('rtl');
  });

  it('forces the pairing to single when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous', pagePairing: 'double' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.pagePairing).toBe('single');
  });

  it('forces the pairing to single when the book is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous' };
    expect(applyEdit(webtoon, { pagePairing: 'double-after-cover' }).pagePairing).toBe('single');
    expect(applyEdit(webtoon, { title: 'Tower of God' }).pagePairing).toBe('single');
  });

  it('keeps a chosen pairing on a paged book', () => {
    expect(applyEdit(book, { pagePairing: 'double-after-cover' }).pagePairing).toBe(
      'double-after-cover',
    );
    expect(applyEdit(book, { layoutKind: 'paged' }).pagePairing).toBe('double');
  });

  it('forces the fit to width when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous', pageFit: 'height' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.pageFit).toBe('width');
  });

  it('forces the fit to width when the book is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous' };
    expect(applyEdit(webtoon, { pageFit: 'height' }).pageFit).toBe('width');
    expect(applyEdit(webtoon, { title: 'Tower of God' }).pageFit).toBe('width');
  });

  it('keeps a chosen fit on a paged book', () => {
    expect(applyEdit(book, { pageFit: 'width' }).pageFit).toBe('width');
    expect(applyEdit(book, { layoutKind: 'paged' }).pageFit).toBe('height');
  });

  it('trims a title', () => {
    expect(applyEdit(book, { title: '  Blame! 1 \n' }).title).toBe('Blame! 1');
  });

  it('keeps the previous title when the edit title trims to empty', () => {
    expect(applyEdit(book, { title: '   ' }).title).toBe('Yotsuba&! 1');
    expect(applyEdit(book, { title: '' }).title).toBe('Yotsuba&! 1');
  });
});

describe('defaultPageFit', () => {
  it('fits a paged book to its height', () => {
    expect(defaultPageFit('paged')).toBe('height');
  });

  it('fits a continuous book to its width', () => {
    expect(defaultPageFit('continuous')).toBe('width');
  });
});
