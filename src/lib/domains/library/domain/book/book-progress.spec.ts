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
    language: 'ja',
    layoutKind,
    direction: 'rtl',
    pagePairing: DEFAULT_PAGE_PAIRING,
    pageFit: defaultPageFit(layoutKind),
    sourceKind: layoutKind === 'flow' ? 'epub' : 'archive',
    contentHash: contentHash('f0e1'),
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
  it('numbers the page a paged book is open at against its image count', () => {
    const paged = book('paged', 120, imagePlace(imageIndex(6)));

    expect(bookProgress(paged)).toEqual({
      kind: 'known',
      label: 'p.007 / 120',
      filled: (7 / 120) * 100,
    });
  });

  it('counts the images a continuous book has been scrolled through', () => {
    const strip = book('continuous', 40, imagePlace(imageIndex(9)));

    expect(bookProgress(strip)).toEqual({ kind: 'known', label: '10 / 40 images', filled: 25 });
  });

  it('shows the first page of a book nobody has opened yet', () => {
    const paged = book('paged', 120, imagePlace(imageIndex(0)));

    expect(bookProgress(paged)).toEqual({ kind: 'known', label: 'p.001 / 120', filled: 5 / 6 });
  });

  it('holds a stored index past the last image to the last page', () => {
    const paged = book('paged', 3, imagePlace(imageIndex(99)));

    expect(bookProgress(paged)).toEqual({ kind: 'known', label: 'p.003 / 3', filled: 100 });
  });

  it('fills the whole bar for a book that holds no images at all', () => {
    const broken = book('paged', 0, imagePlace(imageIndex(0)));

    expect(bookProgress(broken)).toEqual({ kind: 'known', label: 'p.001 / 0', filled: 100 });
  });
});

describe('bookProgress for a book of flowing text', () => {
  it('names the percentage of the text the reader has reached', () => {
    expect(bookProgress(novel(textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.37)))).toEqual({
      kind: 'known',
      label: '37%',
      filled: 37,
    });
  });

  it('rounds the percentage it prints the way the footer rounds it', () => {
    const at = bookProgress(novel(textPlace('epubcfi(/6/14!/4/2/14/1:0)', 0.376)));

    expect(at).toEqual({ kind: 'known', label: '38%', filled: 37.6 });
  });

  it('says nothing for a novel stored before a fraction was ever kept', () => {
    expect(bookProgress(novel(textPlace('epubcfi(/6/14!/4/2/14/1:0)', null)))).toEqual({
      kind: 'unknown',
    });
  });

  it('says nothing for a novel nobody has opened yet', () => {
    expect(bookProgress(novel(START_OF_THE_TEXT))).toEqual({ kind: 'unknown' });
  });

  it('names a whole percent rather than a bare zero at the very first character', () => {
    expect(bookProgress(novel(textPlace('epubcfi(/6/4!/2)', 0)))).toEqual({
      kind: 'known',
      label: '0%',
      filled: 0,
    });
  });

  it('names the end of a novel the reader has finished', () => {
    expect(bookProgress(novel(textPlace('epubcfi(/6/40!/4/2)', 1)))).toEqual({
      kind: 'known',
      label: '100%',
      filled: 100,
    });
  });
});
