import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { imagePlace, START_OF_THE_TEXT, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { bookProgress } from './book-progress';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';

function book(layoutKind: LayoutKind, imageCount: number, position: ReadingPlace): Book {
  return {
    id: bookId('book-1'),
    title: 'Yotsuba&! 1',
    alias: null,
    language: 'ja',
    layoutKind,
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: layoutKind === 'flow' ? 'epub' : 'archive',
    contentHash: contentHash('f0e1'),
    fileName: 'book.cbz',
    imageCount,
    addedAt: 1758240000000,
    position,
    lastReadAt: null,
    finishedAt: null,
  };
}

function novel(position: ReadingPlace): Book {
  return book('flow', 0, position);
}

describe('bookProgress for a book of images', () => {
  it.each([
    ['an open book', 6, 'p.007 / 120', (7 / 120) * 100],
    ['a book nobody has opened yet', 0, 'p.001 / 120', 5 / 6],
  ])(
    'numbers the page a paged book is open at against its image count, for %s',
    (_, index, label, filled) => {
      const paged = book('paged', 120, imagePlace(imageIndex(index)));

      expect(bookProgress(paged)).toEqual({ kind: 'known', label, filled });
    },
  );

  it('counts the images a continuous book has been scrolled through', () => {
    const strip = book('continuous', 40, imagePlace(imageIndex(9)));

    expect(bookProgress(strip)).toEqual({ kind: 'known', label: '10 / 40 images', filled: 25 });
  });

  it('holds a stored index past the last image to the last page', () => {
    const paged = book('paged', 3, imagePlace(imageIndex(99)));

    expect(bookProgress(paged)).toEqual({ kind: 'known', label: 'p.003 / 3', filled: 100 });
  });

  it.each([
    ['paged', 5, 3, 4, 'p.005 / 5'],
    ['continuous', 40, 38, 39, '40 / 40 images'],
  ] as const)(
    'names the last image a %s book showed and fills the whole bar',
    (layoutKind, imageCount, at, shownThrough, label) => {
      const shown = book(
        layoutKind,
        imageCount,
        imagePlace(imageIndex(at), imageIndex(shownThrough)),
      );

      expect(bookProgress(shown)).toEqual({ kind: 'known', label, filled: 100 });
    },
  );

  it('fills the whole bar for a book that holds no images at all', () => {
    const broken = book('paged', 0, imagePlace(imageIndex(0)));

    expect(bookProgress(broken)).toEqual({ kind: 'known', label: 'p.001 / 0', filled: 100 });
  });
});

describe('bookProgress for a book of flowing text', () => {
  it.each([
    ['epubcfi(/6/14!/4/2/14/1:0)', 0.37, '37%', 37],
    ['epubcfi(/6/40!/4/2)', 1, '100%', 100],
  ])(
    'names the percentage of the text the reader has reached at %s',
    (cfi, fraction, label, filled) => {
      expect(bookProgress(novel(textPlace(cfi, fraction)))).toEqual({
        kind: 'known',
        label,
        filled,
      });
    },
  );

  it('rounds the percentage it prints the way the footer rounds it', () => {
    const at = bookProgress(novel(textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.376)));

    expect(at).toEqual({ kind: 'known', label: '38%', filled: 37.6 });
  });

  it.each([
    ['stored before a fraction was ever kept', textPlace('epubcfi(/6/14!/4/2/14/1:0)', null)],
    ['nobody has opened yet', START_OF_THE_TEXT],
  ])('says nothing for a novel %s', (_, position) => {
    expect(bookProgress(novel(position))).toEqual({ kind: 'unknown' });
  });

  it('names 0% rather than nothing at the very first character', () => {
    expect(bookProgress(novel(textPlace('epubcfi(/6/4!/2)', 0)))).toEqual({
      kind: 'known',
      label: '0%',
      filled: 0,
    });
  });
});
