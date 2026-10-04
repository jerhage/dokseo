import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import {
  NOT_OPENED,
  OPENING,
  heldBook,
  readerCurtain,
  readerStage,
  readingNotice,
  shownBook,
  withBook,
} from './reader-opening';
import type { ReaderBook, ReaderOpening } from './reader-opening';

const BOOK: ReaderBook = {
  id: bookId('one'),
  title: 'Blame!',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'double',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 6,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
};

const FLOW = { ...BOOK, layoutKind: 'flow' as const, imageCount: 0 };

const EVERY: readonly ReaderOpening[] = [
  NOT_OPENED,
  OPENING,
  { kind: 'missing', message: 'gone' },
  { kind: 'failed', message: 'bad zip' },
  { kind: 'empty', book: BOOK },
  { kind: 'images', book: BOOK, notice: 'clamped' },
  { kind: 'flow', book: FLOW },
];

describe('readerStage', () => {
  it('names the stage each opening shows', () => {
    expect(EVERY.map(readerStage)).toEqual([
      'settling',
      'settling',
      'settling',
      'failed',
      'empty',
      'reading',
      'settling',
    ]);
  });
});

describe('readerCurtain', () => {
  it('draws a curtain over every opening but a book of images', () => {
    expect(EVERY.map(readerCurtain)).toEqual([
      'Opening the book…',
      'Opening the book…',
      'Opening the book…',
      'bad zip',
      'This book holds no pages to show.',
      null,
      'Opening the book…',
    ]);
  });
});

describe('readingNotice', () => {
  it('reports the notice of a book of images only', () => {
    expect(EVERY.map(readingNotice)).toEqual([null, null, null, null, null, 'clamped', null]);
  });
});

describe('shownBook and heldBook', () => {
  it('shows the book of images, and holds the ebook too', () => {
    expect(EVERY.map(shownBook)).toEqual([null, null, null, null, BOOK, BOOK, null]);
    expect(EVERY.map(heldBook)).toEqual([null, null, null, null, BOOK, BOOK, FLOW]);
  });
});

describe('withBook', () => {
  it('replaces the book of an opened book of images, and leaves every other opening', () => {
    const edited = { ...BOOK, direction: 'ltr' as const };

    expect(EVERY.map((opening) => withBook(opening, edited))).toEqual([
      NOT_OPENED,
      OPENING,
      { kind: 'missing', message: 'gone' },
      { kind: 'failed', message: 'bad zip' },
      { kind: 'empty', book: edited },
      { kind: 'images', book: edited, notice: 'clamped' },
      { kind: 'flow', book: FLOW },
    ]);
  });
});
