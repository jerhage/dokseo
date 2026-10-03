import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { RemovedBook } from '$lib/domains/library/domain/book/removed-book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { buildCapturesFile } from './build-captures-file';
import type { CapturesFileContents } from './build-captures-file';
import type { BooklessCapture } from './captures-file';

function shelfBook(id: string, title: string): Book {
  return {
    id: bookId(id),
    title,
    alias: 'Yotsuba',
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'auto',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('0123456789abcdef0123456789abcdef'),
    fileName: `${id}.cbz`,
    imageCount: 182,
    addedAt: 1,
    position: imagePlace(imageIndex(3)),
    lastReadAt: 2,
    finishedAt: null,
  };
}

const SHELF = shelfBook('shelf-1', 'Yotsuba&! 1');

const IDLE = shelfBook('idle-1', 'Aaa idle');

const REMOVED: RemovedBook = {
  id: bookId('gone-1'),
  title: 'Aria 3',
  alias: null,
  contentHash: 'fedcba',
  fileName: 'aria-3.pdf',
  language: 'ko',
  direction: 'ltr',
  addedAt: null,
};

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'kanji', colour: 'sage', createdAt: 10 };

const GRAMMAR: Tag = { id: tagId('tag-grammar'), name: 'grammar', colour: 'rose', createdAt: 5 };

const RECOGNIZED: Capture = {
  id: captureId('capture-b'),
  bookId: SHELF.id,
  anchor: regionAnchor([{ index: imageIndex(4), rect: imageRect(10, 20, 30, 40) }]),
  text: 'よつば',
  origin: 'recognized',
  confidence: 0.92,
  note: 'first page',
  createdAt: 200,
  editedAt: 250,
  tagIds: [KANJI.id, GRAMMAR.id],
};

const LIFTED: Capture = {
  id: captureId('capture-a'),
  bookId: SHELF.id,
  anchor: textAnchor('epubcfi(/6/4!/4/2)', { exact: 'a', prefix: 'b', suffix: 'c' }, null),
  text: 'lifted',
  origin: 'lifted',
  note: null,
  createdAt: 200,
  editedAt: null,
  tagIds: [],
};

const WRITTEN: Capture = {
  id: captureId('capture-c'),
  bookId: REMOVED.id,
  anchor: regionAnchor([]),
  text: 'written',
  origin: 'written',
  createdAt: 100,
  editedAt: null,
  tagIds: [KANJI.id],
};

const STRAY: Capture = { ...WRITTEN, id: captureId('capture-stray'), bookId: bookId('nowhere') };

const CONTENTS: CapturesFileContents = {
  books: [SHELF, IDLE],
  removedBooks: [REMOVED],
  tags: [KANJI, GRAMMAR],
  captures: [RECOGNIZED, WRITTEN, LIFTED, STRAY],
  exportedAt: 1759449600000,
  appVersion: '0.9.3',
};

const BUILT = buildCapturesFile(CONTENTS);

function bookless(capture: Capture): BooklessCapture {
  const { bookId: _bookId, ...rest } = capture;
  return rest;
}

describe('buildCapturesFile', () => {
  it('names the format and version, and carries the export time and app version', () => {
    expect(BUILT.file).toMatchObject({
      format: 'dokseo-captures',
      version: 1,
      exportedAt: 1759449600000,
      appVersion: '0.9.3',
    });
  });

  it('includes only books a capture belongs to, keyed by title order', () => {
    expect(BUILT.file.books.map((book) => [book.key, book.title])).toEqual([
      ['book-1', 'Aria 3'],
      ['book-2', 'Yotsuba&! 1'],
    ]);
  });

  it('writes a removed book with null layout kind, source kind and image count', () => {
    expect(BUILT.file.books[0]).toEqual({
      key: 'book-1',
      contentHash: 'fedcba',
      fileName: 'aria-3.pdf',
      title: 'Aria 3',
      alias: null,
      language: 'ko',
      direction: 'ltr',
      layoutKind: null,
      sourceKind: null,
      imageCount: null,
    });
  });

  it('prefers the shelf book when a removed record shares its id', () => {
    const built = buildCapturesFile({
      ...CONTENTS,
      removedBooks: [REMOVED, { ...REMOVED, id: SHELF.id, title: SHELF.title }],
    });

    expect(built.file.books[1]).toMatchObject({ sourceKind: 'archive', imageCount: 182 });
  });

  it('orders captures by creation time then id, and tags by creation time', () => {
    expect(BUILT.file.captures.map((capture) => capture.id)).toEqual([
      'capture-c',
      'capture-a',
      'capture-b',
    ]);
    expect(BUILT.file.tags).toEqual([GRAMMAR, KANJI]);
  });

  it('replaces each book id with its file key', () => {
    expect(BUILT.file.captures[2]).toEqual({ ...bookless(RECOGNIZED), bookKey: 'book-2' });
    expect(BUILT.json).not.toContain('"shelf-1"');
  });

  it('leaves out a capture whose book it does not hold, and reports it', () => {
    expect(BUILT.bookless).toEqual([STRAY.id]);
  });

  it('writes the same text whatever order the input arrives in', () => {
    const shuffled = buildCapturesFile({
      ...CONTENTS,
      books: [IDLE, SHELF],
      tags: [GRAMMAR, KANJI],
      captures: [STRAY, LIFTED, WRITTEN, RECOGNIZED],
    });

    expect(shuffled.json).toBe(BUILT.json);
  });
});
