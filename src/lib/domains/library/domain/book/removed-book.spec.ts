import { describe, expect, it } from 'vitest';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from './book';
import {
  removedBookFromStored,
  removedBooksFromStored,
  removedRecord,
  restoreCandidateFrom,
  restoreCandidatesFrom,
} from './removed-book';
import type { RemovedBook } from './removed-book';

const BOOK: Book = {
  id: bookId('book-1'),
  title: 'Yotsuba&! 1',
  alias: 'Mine',
  seriesId: null,
  volume: null,
  language: 'ko',
  layoutKind: 'continuous',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash('9f86d081884c7d659a2feaa0c55ad015'),
  fileName: 'Yotsuba&! 1.cbz',
  imageCount: 182,
  addedAt: 5,
  position: imagePlace(imageIndex(3), imageIndex(4), 0.35),
  lastReadAt: 7,
  finishedAt: null,
};

const RECORD: RemovedBook = { ...BOOK, removedAt: 9 };

describe('removedRecord', () => {
  it('keeps the whole book and adds the time it was removed', () => {
    expect(removedRecord(BOOK, 9)).toEqual(RECORD);
  });
});

describe('removedBookFromStored', () => {
  it('reads a whole stored record exactly, the direction it was set to included', () => {
    expect(removedBookFromStored({ ...RECORD })).toEqual(RECORD);
  });

  it.each([
    ['without its removed time', { ...BOOK }],
    ['with a removed time that is text', { ...RECORD, removedAt: '9' }],
    ['with a removed time that is not finite', { ...RECORD, removedAt: Number.NaN }],
    ['without its language', { ...RECORD, language: undefined }],
    ['with a legacy content hash', { ...RECORD, contentHash: 'a'.repeat(64) }],
    ['with a negative image count', { ...RECORD, imageCount: -1 }],
    ['without its position', { ...RECORD, position: undefined }],
  ])('throws a corrupt row for a record %s', (_, stored) => {
    expect(() => removedBookFromStored(stored)).toThrow(CorruptRow);
  });

  it('names the removed time a record lacks', () => {
    expect(() => removedBookFromStored({ ...BOOK })).toThrow(
      'A stored removed book lacks its removed time',
    );
  });
});

describe('removedBooksFromStored', () => {
  it('reads the records that read and sets the rest apart as they are', () => {
    const old = { id: 'book-2', title: 'Gone', contentHash: 'abc' };

    expect(removedBooksFromStored([RECORD, old])).toEqual({
      removed: [RECORD],
      unreadable: [old],
    });
  });
});

describe('restoreCandidateFrom', () => {
  it('takes the identity a re-upload matches on from a row it cannot read', () => {
    expect(
      restoreCandidateFrom({
        id: 'book-1',
        title: 'Yotsuba&! 1',
        alias: 'Mine',
        seriesId: 'series-1',
        volume: 2.5,
        contentHash: 'a'.repeat(64),
        fileName: 'Yotsuba&! 1.cbz',
        addedAt: 5,
      }),
    ).toEqual({
      id: 'book-1',
      title: 'Yotsuba&! 1',
      alias: 'Mine',
      seriesId: 'series-1',
      volume: 2.5,
      contentHash: 'a'.repeat(64),
      fileName: 'Yotsuba&! 1.cbz',
      addedAt: 5,
    });
  });

  it('falls back field by field for a row that lacks them', () => {
    expect(restoreCandidateFrom({ id: 'book-1', title: '  ', contentHash: 7 })).toEqual({
      id: 'book-1',
      title: 'Untitled book',
      alias: null,
      seriesId: null,
      volume: null,
      contentHash: '',
      fileName: '',
      addedAt: null,
    });
  });

  it.each([
    ['absent', undefined, undefined],
    ['null', null, null],
    ['of the wrong type', 7, '2'],
    ['empty or not finite', '', Number.NaN],
  ])('takes a series id and volume that are %s as null', (_, seriesId, volume) => {
    expect(restoreCandidateFrom({ id: 'book-1', title: 'x', seriesId, volume })).toMatchObject({
      seriesId: null,
      volume: null,
    });
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['blank', '  '],
    ['not text', 7],
  ])('keeps no alias when the row holds one that is %s', (_, alias) => {
    expect(restoreCandidateFrom({ id: 'book-1', title: 'x', alias })?.alias).toBeNull();
  });

  it('answers null for a row with no usable id', () => {
    expect(restoreCandidateFrom({ id: '../escape', title: 'x' })).toBeNull();
    expect(restoreCandidateFrom({ title: 'x' })).toBeNull();
  });
});

describe('restoreCandidatesFrom', () => {
  it('drops a row with no usable id and keeps the rest', () => {
    expect(restoreCandidatesFrom([{ id: 7 }, { id: 'book-2' }]).map((book) => book.id)).toEqual([
      'book-2',
    ]);
  });
});
