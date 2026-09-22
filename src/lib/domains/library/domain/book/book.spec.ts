import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import { applyEdit, defaultPageFit } from './book';
import type { Book } from './book';

const book: Book = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'double',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(3)),
};

describe('applyEdit', () => {
  it('moves the position to the given index', () => {
    expect(applyEdit(book, { position: imagePlace(imageIndex(7)) }).position).toEqual({
      kind: 'image',
      index: 7,
    });
  });

  it('accepts the first index', () => {
    expect(applyEdit(book, { position: imagePlace(imageIndex(0)) }).position).toEqual({
      kind: 'image',
      index: 0,
    });
  });

  it('moves the position to a text place', () => {
    expect(applyEdit(book, { position: textPlace('epubcfi(/6/14!/4/2/1:0)') }).position).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/1:0)',
    });
  });

  it('preserves every other field when it moves the position', () => {
    expect(applyEdit(book, { position: imagePlace(imageIndex(7)) })).toEqual({
      ...book,
      position: imagePlace(imageIndex(7)),
    });
  });

  it('replaces only the named fields and leaves the rest alone', () => {
    expect(applyEdit(book, { title: 'Blame! 1', language: 'ko' })).toEqual({
      ...book,
      title: 'Blame! 1',
      language: 'ko',
    });
  });

  it('returns a new object and leaves the original untouched', () => {
    const edited = applyEdit(book, { title: 'Blame! 1', position: imagePlace(imageIndex(7)) });
    expect(edited).not.toBe(book);
    expect(book.title).toBe('Yotsuba&! 1');
    expect(book.position).toEqual({ kind: 'image', index: 3 });
  });

  it('keeps the direction when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.direction).toBe('rtl');
  });

  it('stores a direction chosen for a book that is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous', direction: 'ltr' };
    expect(applyEdit(webtoon, { direction: 'rtl' }).direction).toBe('rtl');
    expect(applyEdit(webtoon, { title: 'Tower of God' }).direction).toBe('ltr');
  });

  it('keeps right to left on a paged book', () => {
    expect(applyEdit(book, { direction: 'rtl' }).direction).toBe('rtl');
    expect(applyEdit(book, { layoutKind: 'paged' }).direction).toBe('rtl');
  });

  it('keeps the pairing when the edit turns the book continuous', () => {
    const edited = applyEdit(book, { layoutKind: 'continuous' });
    expect(edited.layoutKind).toBe('continuous');
    expect(edited.pagePairing).toBe('double');
  });

  it('stores a pairing chosen for a book that is already continuous', () => {
    const webtoon: Book = { ...book, layoutKind: 'continuous' };
    expect(applyEdit(webtoon, { pagePairing: 'double-after-cover' }).pagePairing).toBe(
      'double-after-cover',
    );
    expect(applyEdit(webtoon, { title: 'Tower of God' }).pagePairing).toBe('double');
  });

  it('returns a right-to-left two-page book unharmed from a trip through continuous', () => {
    const strip = applyEdit(book, { layoutKind: 'continuous' });
    const back = applyEdit(strip, { layoutKind: 'paged' });

    expect(back.direction).toBe('rtl');
    expect(back.pagePairing).toBe('double');
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
