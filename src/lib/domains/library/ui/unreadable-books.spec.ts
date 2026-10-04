import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import type { UnreadableBook } from '../domain/book/stored-book';
import {
  mergeLabel,
  mergeTargets,
  unreadableBookName,
  unreadableBooksTitle,
} from './unreadable-books';

describe('unreadableBooksTitle', () => {
  it.each([
    [1, '1 book could not be read'],
    [2, '2 books could not be read'],
  ])('names %i unreadable books', (count, title) => {
    expect(unreadableBooksTitle(count)).toBe(title);
  });
});

describe('unreadableBookName', () => {
  it('names the book by its stored title', () => {
    expect(
      unreadableBookName({
        id: bookId('b-1'),
        title: 'Yotsuba&! 2',
        alias: null,
        contentHash: '',
        fileName: '',
        stored: {},
      }),
    ).toBe('Yotsuba&! 2');
  });

  it('names a renamed book by its alias, then its original title', () => {
    expect(
      unreadableBookName({
        id: bookId('b-1'),
        title: 'Yotsuba&! 2',
        alias: 'Mine',
        contentHash: '',
        fileName: '',
        stored: {},
      }),
    ).toBe('Mine (originally Yotsuba&! 2)');
  });

  it.each([null, '  '])('names a renamed book without a title %j by its alias', (title) => {
    expect(
      unreadableBookName({
        id: bookId('b-1'),
        title,
        alias: 'Mine',
        contentHash: '',
        fileName: '',
        stored: {},
      }),
    ).toBe('Mine');
  });

  it.each([null, '  '])('names a book without a title %j by a short id', (title) => {
    expect(
      unreadableBookName({
        id: bookId('0123456789abcdef'),
        title,
        alias: null,
        contentHash: '',
        fileName: '',
        stored: {},
      }),
    ).toBe('Untitled book (01234567)');
  });
});

const KINO = 'キノの旅 the Beautiful World';

function shelfBook(overrides: Partial<Book> = {}): Book {
  return {
    id: bookId('6a7bd926-held'),
    title: KINO,
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'epub',
    contentHash: contentHash('df4501a90bd46d5eb4713294409bf7e7'),
    fileName: `${KINO}.epub`,
    imageCount: 12,
    addedAt: 1,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function broken(overrides: Partial<UnreadableBook> = {}): UnreadableBook {
  return {
    id: bookId('a816bb74-9c83-4e11-a8bf-ce63119b9e24'),
    title: KINO,
    alias: null,
    contentHash: 'a'.repeat(64),
    fileName: '',
    stored: {},
    ...overrides,
  };
}

describe('mergeTargets', () => {
  it('offers the shelf book of the same title for an unreadable SHA-256 row with no file name', () => {
    const held = shelfBook();

    expect(mergeTargets([broken()], [held])).toEqual(new Map([[broken().id, held]]));
  });

  it.each([
    ['content hash', { title: 'Other', contentHash: 'df4501a90bd46d5eb4713294409bf7e7' }],
    ['file name', { title: 'Other', fileName: `${KINO}.epub` }],
  ])('offers the shelf book that shares its %s', (_, row) => {
    expect(mergeTargets([broken(row)], [shelfBook()]).size).toBe(1);
  });

  it.each([null, ''])('offers nothing for a row titled %j that matches nothing else', (title) => {
    expect(mergeTargets([broken({ title })], [shelfBook()]).size).toBe(0);
  });

  it('offers nothing when no shelf book shares its hash, file name or title', () => {
    expect(mergeTargets([broken()], [shelfBook({ title: 'Other', fileName: 'o.epub' })])).toEqual(
      new Map(),
    );
  });
});

describe('mergeLabel', () => {
  it('names the shelf book by its alias', () => {
    expect(mergeLabel(shelfBook({ alias: 'Kino' }))).toBe('Merge into Kino');
  });
});
