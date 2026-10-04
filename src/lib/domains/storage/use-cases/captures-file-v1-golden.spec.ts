import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { removedBooksFromStored } from '$lib/domains/library/domain/book/removed-book';
import { booksFromStored } from '$lib/domains/library/domain/book/stored-book';
import { capturesFromStored } from '$lib/domains/recognition/domain/capture/capture';
import { tagsFromStored } from '$lib/domains/recognition/domain/tag/tag';
import {
  CONTINUOUS_BOOK_ROW,
  FLOW_BOOK_ROW,
  PAGED_BOOK_ROW,
  REMOVED_BOOK_ROWS,
  REMOVED_PAGED_BOOK_ROW,
  SHELF_BOOK_ROWS,
  UNREADABLE_BOOK_ROW,
} from '$lib/shared/testing/stored-format/library-rows';
import {
  CAPTURE_ROWS,
  GRAMMAR_TAG_ROW,
  LIFTED_CAPTURE_ROW,
  RECOGNIZED_CAPTURE_ROW,
  SCORED_CAPTURE_ROW,
  TAG_ROWS,
  UNREADABLE_CAPTURE_ROW,
  UNREADABLE_TAG_ROW,
  VOCABULARY_TAG_ROW,
  WRITTEN_CAPTURE_ROW,
} from '$lib/shared/testing/stored-format/recognition-rows';
import {
  CAPTURES_FILE_CHANGED,
  GOLDEN_FILE_MUST_IMPORT,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { buildCapturesFile } from './build-captures-file';
import type { CapturesFileContents } from './build-captures-file';
import { readCapturesFile } from './read-captures-file';

type BookRow = (typeof SHELF_BOOK_ROWS)[number] | (typeof REMOVED_BOOK_ROWS)[number];

const GOLDEN = readFileSync(
  new URL('../../../shared/testing/stored-format/captures-v1.golden.json', import.meta.url),
  'utf8',
);

function fileBookOf(row: BookRow, key: string) {
  return {
    key,
    contentHash: row.contentHash,
    fileName: row.fileName,
    title: row.title,
    alias: row.alias,
    seriesId: row.seriesId,
    volume: row.volume,
    language: row.language,
    direction: row.direction,
    layoutKind: row.layoutKind,
    sourceKind: row.sourceKind,
    imageCount: row.imageCount,
  };
}

function booklessOf<T extends { readonly bookId: string }>(row: T): Omit<T, 'bookId'> {
  const { bookId: _bookId, ...bookless } = row;
  return bookless;
}

function heldContents(): CapturesFileContents {
  const shelf = booksFromStored([...SHELF_BOOK_ROWS, UNREADABLE_BOOK_ROW]);
  const tags = tagsFromStored([...TAG_ROWS, UNREADABLE_TAG_ROW]);
  const captures = capturesFromStored([...CAPTURE_ROWS, UNREADABLE_CAPTURE_ROW]);
  return {
    books: shelf.books,
    removedBooks: removedBooksFromStored(REMOVED_BOOK_ROWS).removed,
    unreadableRemovedBooks: [],
    unreadableBooks: shelf.unreadable,
    tags: tags.tags,
    unreadableTags: tags.unreadable,
    captures: captures.captures,
    unreadableCaptures: captures.unreadable,
    exportedAt: 1791000000000,
    appVersion: '1.0.0',
  };
}

const REMOVED_ENTRY = fileBookOf(REMOVED_PAGED_BOOK_ROW, 'book-1');

const PAGED_ENTRY = fileBookOf(PAGED_BOOK_ROW, 'book-2');

const FLOW_ENTRY = fileBookOf(FLOW_BOOK_ROW, 'book-3');

const CONTINUOUS_ENTRY = fileBookOf(CONTINUOUS_BOOK_ROW, 'book-4');

const BOOK_ENTRY_FIELDS = [
  'alias',
  'contentHash',
  'direction',
  'fileName',
  'imageCount',
  'key',
  'language',
  'layoutKind',
  'seriesId',
  'sourceKind',
  'title',
  'volume',
];

const RECOGNIZED_ENTRY_FIELDS = [
  'anchor',
  'bookKey',
  'confidence',
  'createdAt',
  'editedAt',
  'id',
  'note',
  'origin',
  'tagIds',
  'text',
];

describe('captures-v1.golden.json', () => {
  it('reads to exactly the books, tags and captures it was written from', () => {
    expect(readCapturesFile(GOLDEN), GOLDEN_FILE_MUST_IMPORT).toStrictEqual({
      kind: 'read',
      exportedAt: 1791000000000,
      appVersion: '1.0.0',
      books: [REMOVED_ENTRY, PAGED_ENTRY, FLOW_ENTRY, CONTINUOUS_ENTRY],
      tags: [VOCABULARY_TAG_ROW, GRAMMAR_TAG_ROW],
      captures: [
        { book: CONTINUOUS_ENTRY, capture: booklessOf(SCORED_CAPTURE_ROW) },
        { book: REMOVED_ENTRY, capture: booklessOf(WRITTEN_CAPTURE_ROW) },
        { book: PAGED_ENTRY, capture: booklessOf(RECOGNIZED_CAPTURE_ROW) },
        { book: FLOW_ENTRY, capture: booklessOf(LIFTED_CAPTURE_ROW) },
      ],
      unreadable: [],
      droppedTags: [],
      storedUnreadable: 3,
    });
  });

  it('keeps the stored rows that could not be read exactly as they were stored', () => {
    expect(JSON.parse(GOLDEN).unreadable, GOLDEN_FILE_MUST_IMPORT).toStrictEqual({
      books: [UNREADABLE_BOOK_ROW],
      tags: [UNREADABLE_TAG_ROW],
      captures: [UNREADABLE_CAPTURE_ROW],
    });
  });

  it('matches byte for byte the file the builder writes from the same holdings', () => {
    const built = buildCapturesFile(heldContents());

    expect(built.file, CAPTURES_FILE_CHANGED).toStrictEqual(JSON.parse(GOLDEN));
    expect(built.json, CAPTURES_FILE_CHANGED).toBe(JSON.stringify(JSON.parse(GOLDEN)));
    expect(built.bookless, CAPTURES_FILE_CHANGED).toStrictEqual([]);
  });

  it('writes exactly the 1.x sections, book fields and capture fields', () => {
    const { file } = buildCapturesFile(heldContents());

    expect(sortedKeys(file), CAPTURES_FILE_CHANGED).toStrictEqual([
      'appVersion',
      'books',
      'captures',
      'exportedAt',
      'format',
      'tags',
      'unreadable',
      'version',
    ]);
    expect([file.format, file.version], CAPTURES_FILE_CHANGED).toStrictEqual([
      'dokseo-captures',
      1,
    ]);
    expect(file.books.map(sortedKeys), CAPTURES_FILE_CHANGED).toStrictEqual(
      file.books.map(() => BOOK_ENTRY_FIELDS),
    );
    expect(file.captures.map(sortedKeys), CAPTURES_FILE_CHANGED).toStrictEqual([
      RECOGNIZED_ENTRY_FIELDS,
      ['anchor', 'bookKey', 'createdAt', 'editedAt', 'id', 'origin', 'tagIds', 'text'],
      RECOGNIZED_ENTRY_FIELDS,
      ['anchor', 'bookKey', 'createdAt', 'editedAt', 'id', 'note', 'origin', 'tagIds', 'text'],
    ]);
    expect(sortedKeys(file.unreadable ?? {}), CAPTURES_FILE_CHANGED).toStrictEqual([
      'books',
      'captures',
      'tags',
    ]);
  });
});
