import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex, seriesId } from '$lib/shared/ids';
import { START_OF_THE_TEXT, imagePlace, textPlace } from '$lib/shared/reading-place';
import { replacedFile } from './book-replacement';
import type { ReplacementFile } from './book-replacement';
import type { Book } from './book';

const book: Book = {
  id: bookId('b-1'),
  title: 'Yotsuba&! 1',
  alias: 'Yotsuba 1',
  seriesId: seriesId('s-1'),
  volume: 1,
  language: 'ja',
  layoutKind: 'continuous',
  direction: 'rtl',
  pagePairing: 'double',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(120), imageIndex(121), 0.4),
  lastReadAt: 1758250000000,
  finishedAt: null,
};

const file: ReplacementFile = {
  sourceKind: 'archive',
  contentHash: contentHash('b2'),
  fileName: 'book v2.cbz',
  layoutKind: 'paged',
  imageCount: 190,
};

describe('replacedFile', () => {
  it('takes the file fields and keeps every other field of the book', () => {
    expect(replacedFile(book, file)).toEqual({
      ...book,
      contentHash: contentHash('b2'),
      fileName: 'book v2.cbz',
      imageCount: 190,
    });
  });

  it('keeps the layout the reader chose while the pages stay images', () => {
    expect(replacedFile(book, file).layoutKind).toBe('continuous');
  });

  it('keeps a place that the new pages still contain', () => {
    expect(replacedFile(book, file).position).toEqual(book.position);
  });

  it('moves a place past the last page back to the last page', () => {
    const shorter = replacedFile(book, { ...file, imageCount: 100 });

    expect(shorter.position).toEqual(imagePlace(imageIndex(99), imageIndex(99), 0.4));
  });

  it('keeps the first page of a place that starts inside the new pages and ends past them', () => {
    const shorter = replacedFile(book, { ...file, imageCount: 121 });

    expect(shorter.position).toEqual(imagePlace(imageIndex(120), imageIndex(120), 0.4));
  });

  it('keeps a text place as it is', () => {
    const reflowing: Book = {
      ...book,
      layoutKind: 'flow',
      sourceKind: 'epub',
      position: textPlace('epubcfi(/6/14!/4/2/1:0)', 0.3),
    };

    const replaced = replacedFile(reflowing, {
      ...file,
      sourceKind: 'epub',
      layoutKind: 'flow',
      imageCount: 0,
    });

    expect(replaced.position).toEqual(reflowing.position);
    expect(replaced.layoutKind).toBe('flow');
  });

  it('starts the text and takes the default fit when images become a flowing text', () => {
    const replaced = replacedFile(book, { ...file, sourceKind: 'epub', layoutKind: 'flow' });

    expect(replaced.layoutKind).toBe('flow');
    expect(replaced.pageFit).toBe('width');
    expect(replaced.position).toEqual(START_OF_THE_TEXT);
  });

  it('starts at the first page and takes the paged layout when a flowing text becomes images', () => {
    const reflowing: Book = {
      ...book,
      layoutKind: 'flow',
      sourceKind: 'epub',
      position: textPlace('epubcfi(/6/14!/4/2/1:0)', 0.3),
    };

    const replaced = replacedFile(reflowing, file);

    expect(replaced.layoutKind).toBe('paged');
    expect(replaced.pageFit).toBe('height');
    expect(replaced.position).toEqual(imagePlace(imageIndex(0)));
  });
});
