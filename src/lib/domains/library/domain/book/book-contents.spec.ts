import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import {
  bookContents,
  describeBookContents,
  describeLibraryContents,
  libraryContents,
} from './book-contents';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';

function book(layoutKind: LayoutKind, imageCount: number, id = 'book-1'): Book {
  return {
    id: bookId(id),
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
    position: layoutKind === 'flow' ? START_OF_THE_TEXT : imagePlace(imageIndex(0)),
  };
}

const NOVEL = book('flow', 0, 'novel');

describe('bookContents', () => {
  it('counts the images of a paged book', () => {
    expect(bookContents(book('paged', 182))).toEqual({ kind: 'images', imageCount: 182 });
  });

  it('counts the images of a continuous book', () => {
    expect(bookContents(book('continuous', 40))).toEqual({ kind: 'images', imageCount: 40 });
  });

  it('reports flowing text for a book with no images to count', () => {
    expect(bookContents(NOVEL)).toEqual({ kind: 'flowing-text' });
  });
});

describe('describeBookContents', () => {
  it('names the number of images a paged book holds', () => {
    expect(describeBookContents(bookContents(book('paged', 182)))).toBe('182 images');
  });

  it('says image once for a single-page upload', () => {
    expect(describeBookContents(bookContents(book('paged', 1)))).toBe('1 image');
  });

  it('names what a flow book holds instead of counting images it has none of', () => {
    expect(describeBookContents(bookContents(NOVEL))).toBe('Flowing text');
  });
});

describe('libraryContents', () => {
  it('reports an empty library', () => {
    expect(libraryContents([])).toEqual({ kind: 'empty' });
  });

  it('sums the images of a library holding image books only', () => {
    const books = [book('paged', 182, 'a'), book('continuous', 40, 'b')];

    expect(libraryContents(books)).toEqual({ kind: 'images', bookCount: 2, imageCount: 222 });
  });

  it('counts flow books rather than summing the images they do not have', () => {
    const books = [NOVEL, book('flow', 0, 'other-novel')];

    expect(libraryContents(books)).toEqual({ kind: 'flowing', bookCount: 2 });
  });

  it('separates the two kinds when a library holds both', () => {
    const books = [
      book('paged', 182, 'a'),
      book('paged', 200, 'b'),
      book('paged', 230, 'c'),
      NOVEL,
    ];

    expect(libraryContents(books)).toEqual({
      kind: 'mixed',
      imageBooks: 3,
      imageCount: 612,
      flowingBooks: 1,
    });
  });
});

describe('describeLibraryContents', () => {
  it('says how many books and how many images a manga library holds', () => {
    const books = [book('paged', 182, 'a'), book('paged', 40, 'b')];

    expect(describeLibraryContents(libraryContents(books))).toBe('2 books · 222 images');
  });

  it('names flowing text instead of an image total when no book has images', () => {
    expect(describeLibraryContents(libraryContents([NOVEL]))).toBe('1 book · flowing text');
  });

  it('says how many books the image total covers when a library holds both kinds', () => {
    const books = [
      book('paged', 182, 'a'),
      book('paged', 200, 'b'),
      book('paged', 230, 'c'),
      NOVEL,
    ];

    expect(describeLibraryContents(libraryContents(books))).toBe(
      '4 books · 612 images across 3 · 1 flowing text',
    );
  });

  it('pluralises the flowing books it names', () => {
    const books = [book('paged', 182, 'a'), NOVEL, book('flow', 0, 'other-novel')];

    expect(describeLibraryContents(libraryContents(books))).toBe(
      '3 books · 182 images across 1 · 2 flowing texts',
    );
  });

  it('says nothing about images in an empty library', () => {
    expect(describeLibraryContents(libraryContents([]))).toBe('0 books');
  });

  it('groups the thousands of a large image total', () => {
    expect(describeLibraryContents(libraryContents([book('paged', 12_000)]))).toBe(
      '1 book · 12,000 images',
    );
  });
});
