import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import type {
  RemovedBook,
  UnreadableRemovedBook,
} from '$lib/domains/library/domain/book/removed-book';
import type { UnreadableBook } from '$lib/domains/library/domain/book/stored-book';
import type { Capture, UnreadableCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag, UnreadableTag } from '$lib/domains/recognition/domain/tag/tag';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex, seriesId, tagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { buildCapturesFile } from './build-captures-file';
import type { CapturesFileContents } from './build-captures-file';
import type { BooklessCapture } from './captures-file';
import { readCapturesFile } from './read-captures-file';
import type { ReadCapturesFileResult } from './read-captures-file';

function shelfBook(id: string, title: string): Book {
  return {
    id: bookId(id),
    title,
    alias: 'Yotsuba',
    seriesId: null,
    volume: null,
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
  ...shelfBook('gone-1', 'Aria 3'),
  alias: null,
  language: 'ko',
  layoutKind: 'continuous',
  direction: 'ltr',
  sourceKind: 'pdf',
  contentHash: contentHash('fedcba9876543210fedcba9876543210'),
  fileName: 'aria-3.pdf',
  imageCount: 40,
  removedAt: 3,
};

const KANJI: Tag = { id: tagId('tag-kanji'), name: 'kanji', colour: 'sage', createdAt: 10 };

const GRAMMAR: Tag = { id: tagId('tag-grammar'), name: 'grammar', colour: 'rose', createdAt: 5 };

const RECOGNIZED: Capture = {
  id: captureId('capture-b'),
  bookId: SHELF.id,
  anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.01, 0.02, 0.03, 0.04) }]),
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
  unreadableRemovedBooks: [],
  unreadableBooks: [],
  tags: [KANJI, GRAMMAR],
  unreadableTags: [],
  captures: [RECOGNIZED, WRITTEN, LIFTED, STRAY],
  unreadableCaptures: [],
  exportedAt: 1759449600000,
  appVersion: '0.9.3',
};

const BUILT = buildCapturesFile(CONTENTS);

const BROKEN_ROW = { ...shelfBook('broken-1', 'Broken 1'), position: 45 };

const BROKEN: UnreadableBook = {
  id: BROKEN_ROW.id,
  title: BROKEN_ROW.title,
  alias: BROKEN_ROW.alias,
  contentHash: BROKEN_ROW.contentHash,
  fileName: BROKEN_ROW.fileName,
  stored: BROKEN_ROW,
};

const UNNAMED_BROKEN: UnreadableBook = {
  ...BROKEN,
  id: bookId('broken-2'),
  stored: { ...BROKEN_ROW, id: bookId('broken-2') },
};

const RETIRED_ROW = {
  id: 'retired-1',
  title: 'Old hash',
  contentHash: 'a'.repeat(64),
  removedAt: 4,
};

const RETIRED: UnreadableRemovedBook = {
  id: bookId('retired-1'),
  title: 'Old hash',
  alias: null,
  seriesId: null,
  volume: null,
  contentHash: 'a'.repeat(64),
  fileName: '',
  addedAt: null,
  language: null,
  stored: RETIRED_ROW,
};

const OLD_CAPTURE: UnreadableCapture = {
  id: captureId('old-capture'),
  stored: { id: 'old-capture', bookId: 'retired-1', text: 'あ', anchor: null },
};

const ODD_CAPTURE: UnreadableCapture = {
  id: captureId('a-odd-capture'),
  stored: { id: 'a-odd-capture', bookId: 'nowhere', confidence: Number.NaN },
};

const NAMELESS_TAG: UnreadableTag = {
  id: tagId('nameless'),
  name: null,
  stored: { id: 'nameless', colour: 'gold' },
};

const WITH_UNREADABLE: CapturesFileContents = {
  ...CONTENTS,
  unreadableBooks: [BROKEN, UNNAMED_BROKEN],
  unreadableRemovedBooks: [RETIRED],
  unreadableTags: [NAMELESS_TAG],
  unreadableCaptures: [OLD_CAPTURE, ODD_CAPTURE],
  captures: [
    ...CONTENTS.captures,
    { ...LIFTED, id: captureId('capture-broken'), bookId: BROKEN.id },
  ],
};

const BUILT_WITH_UNREADABLE = buildCapturesFile(WITH_UNREADABLE);

type Edit = (file: Record<string, unknown>) => void;

function edited(edit: Edit): string {
  const file: Record<string, unknown> = JSON.parse(BUILT.json);
  edit(file);
  return JSON.stringify(file);
}

function entries(file: Record<string, unknown>, section: string): Record<string, unknown>[] {
  return file[section] as Record<string, unknown>[];
}

function entry(file: Record<string, unknown>, section: string, index: number) {
  return entries(file, section)[index] as Record<string, unknown>;
}

function read(text: string) {
  const result = readCapturesFile(text);
  if (result.kind !== 'read') throw new Error(`expected a read file, got ${result.kind}`);
  return result;
}

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

  it('writes a removed book with the layout kind, source kind and image count its record keeps', () => {
    expect(BUILT.file.books[0]).toEqual({
      key: 'book-1',
      contentHash: 'fedcba9876543210fedcba9876543210',
      fileName: 'aria-3.pdf',
      title: 'Aria 3',
      alias: null,
      seriesId: null,
      volume: null,
      language: 'ko',
      direction: 'ltr',
      layoutKind: 'continuous',
      sourceKind: 'pdf',
      imageCount: 40,
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

  it('writes no unreadable section when every row reads', () => {
    expect(BUILT.file).not.toHaveProperty('unreadable');
    expect(BUILT.json).not.toContain('"unreadable"');
  });

  it('keeps the unreadable captures and tags as they were stored, in id order', () => {
    const section = BUILT_WITH_UNREADABLE.file.unreadable;

    expect(section?.tags).toEqual([{ id: 'nameless', colour: 'gold' }]);
    expect(section?.captures).toEqual([
      { id: 'a-odd-capture', bookId: 'nowhere', confidence: null },
      { id: 'old-capture', bookId: 'retired-1', text: 'あ', anchor: null },
    ]);
  });

  it('keeps the stored row of an unreadable book or removed record only when a capture names it', () => {
    expect(BUILT_WITH_UNREADABLE.file.unreadable?.books).toEqual([BROKEN_ROW, RETIRED_ROW]);
  });

  it('keeps no removed record whose id is back on the shelf', () => {
    const built = buildCapturesFile({
      ...WITH_UNREADABLE,
      unreadableRemovedBooks: [
        { ...RETIRED, id: SHELF.id, stored: { ...RETIRED_ROW, id: SHELF.id } },
      ],
      unreadableCaptures: [{ ...OLD_CAPTURE, stored: { ...OLD_CAPTURE.stored, bookId: SHELF.id } }],
    });

    expect(built.file.unreadable?.books).toEqual([BROKEN_ROW]);
  });

  it('writes a readable capture of an unreadable shelf book under the identity its row stores', () => {
    const book = BUILT_WITH_UNREADABLE.file.books.find((held) => held.title === 'Broken 1');

    expect(book).toEqual({
      key: 'book-2',
      contentHash: BROKEN_ROW.contentHash,
      fileName: 'broken-1.cbz',
      title: 'Broken 1',
      alias: 'Yotsuba',
      seriesId: null,
      volume: null,
      language: 'ja',
      direction: 'rtl',
      layoutKind: 'paged',
      sourceKind: 'archive',
      imageCount: 182,
    });
    expect(BUILT_WITH_UNREADABLE.file.captures.map((capture) => capture.bookKey)).toContain(
      'book-2',
    );
    expect(BUILT_WITH_UNREADABLE.bookless).toEqual([STRAY.id]);
  });

  it('writes the unreadable section as JSON whatever the stored rows hold', () => {
    const written = JSON.parse(BUILT_WITH_UNREADABLE.json);

    expect(written.unreadable).toEqual(BUILT_WITH_UNREADABLE.file.unreadable);
    expect(written.unreadable.captures[0].confidence).toBeNull();
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

describe('readCapturesFile', () => {
  it('gives back the books, tags and captures the builder wrote', () => {
    const file = read(BUILT.json);

    expect(file.books).toEqual(BUILT.file.books);
    expect(file.tags).toEqual([GRAMMAR, KANJI]);
    expect(file.captures.map(({ book, capture }) => [book.title, capture])).toEqual([
      ['Aria 3', bookless(WRITTEN)],
      ['Yotsuba&! 1', bookless(LIFTED)],
      ['Yotsuba&! 1', bookless(RECOGNIZED)],
    ]);
    expect(file.unreadable).toEqual([]);
    expect(file.droppedTags).toEqual([]);
    expect([file.exportedAt, file.appVersion]).toEqual([1759449600000, '0.9.3']);
  });

  it('reads a file without an unreadable section as keeping no stored unreadable rows', () => {
    expect(read(BUILT.json).storedUnreadable).toBe(0);
  });

  it('counts the rows of an unreadable section and imports none of them', () => {
    const file = read(BUILT_WITH_UNREADABLE.json);

    expect(file.storedUnreadable).toBe(5);
    expect(file.unreadable).toEqual([]);
    expect(file.tags).toEqual([GRAMMAR, KANJI]);
    expect(file.captures.map(({ capture }) => capture.id)).not.toContain(OLD_CAPTURE.id);
    expect(file.captures).toHaveLength(4);
  });

  it.each([
    ['a section that is not an object', 'kept', 0],
    ['a section whose lists are not lists', { books: 'x', tags: null, captures: [{}, 1] }, 2],
  ])('reads a file with %s and counts only its lists', (_, section, count) => {
    const file = read(edited((raw) => (raw.unreadable = section)));

    expect(file.storedUnreadable).toBe(count);
    expect(file.captures).toHaveLength(3);
  });

  it('gives back the series id and volume the builder wrote for a shelf book and a removed record', () => {
    const built = buildCapturesFile({
      ...CONTENTS,
      books: [{ ...SHELF, seriesId: seriesId('series-1'), volume: 1.5 }, IDLE],
      removedBooks: [{ ...REMOVED, seriesId: seriesId('series-2'), volume: 3 }],
    });

    const written = built.file.books.map((book) => [book.title, book.seriesId, book.volume]);
    expect(written).toEqual([
      ['Aria 3', 'series-2', 3],
      ['Yotsuba&! 1', 'series-1', 1.5],
    ]);
    expect(read(built.json).books).toEqual(built.file.books);
  });

  it.each([
    ['series id', 'seriesId', 'A stored book lacks its series id'],
    ['volume', 'volume', 'A stored book lacks its volume'],
  ])('rejects a book entry that lacks its %s, as a stored book row', (_, name, detail) => {
    const file = read(edited((raw) => delete entry(raw, 'books', 1)[name]));

    expect(file.books.map((book) => book.key)).toEqual(['book-1']);
    expect(file.unreadable[0]).toEqual({
      section: 'books',
      index: 1,
      reason: { kind: 'invalid', detail },
    });
  });

  it.each([
    ['series id', 'seriesId', 7, 'A stored book holds an unknown series id: 7'],
    ['volume', 'volume', '2', 'A stored book holds an unknown volume: 2'],
  ])('rejects a book whose %s has the wrong type', (_, name, value, detail) => {
    const file = read(edited((raw) => (entry(raw, 'books', 1)[name] = value)));

    expect(file.books.map((book) => book.key)).toEqual(['book-1']);
    expect(file.unreadable[0]).toEqual({
      section: 'books',
      index: 1,
      reason: { kind: 'invalid', detail },
    });
  });

  it.each([
    ['a null layout kind', 'layoutKind', null, 'A stored book holds an unknown layout kind: null'],
    ['a null source kind', 'sourceKind', null, 'A stored book holds an unknown source kind: null'],
    ['a null image count', 'imageCount', null, 'A stored book holds an unknown image count: null'],
    ['a negative image count', 'imageCount', -1, 'A stored book holds an unknown image count: -1'],
    ['an empty series id', 'seriesId', '', 'A stored book holds an unknown series id: '],
    [
      'a content hash that is not a partial MD5',
      'contentHash',
      'fedcba',
      'A stored book holds an unknown content hash: fedcba',
    ],
    [
      'an EPUB-only layout from a PDF',
      'layoutKind',
      'flow',
      'A stored book holds an unknown source kind for a flow book: pdf',
    ],
  ])('rejects a book entry with %s', (_, name, value, detail) => {
    const file = read(edited((raw) => (entry(raw, 'books', 0)[name] = value)));

    expect(file.books.map((book) => book.key)).toEqual(['book-2']);
    expect(file.unreadable[0]).toEqual({
      section: 'books',
      index: 0,
      reason: { kind: 'invalid', detail },
    });
  });

  it.each([
    ['text that is not JSON', 'not json {'],
    ['a JSON array', '[]'],
    ['another format', edited((raw) => (raw.format = 'other-app'))],
    ['a missing format', edited((raw) => delete raw.format)],
    ['a version that is not a number', edited((raw) => (raw.version = '1'))],
    ['an older version', edited((raw) => (raw.version = 0))],
    ['a missing section', edited((raw) => delete raw.captures)],
    ['a missing app version', edited((raw) => delete raw.appVersion)],
  ])('reports %s as not an export', (_, text) => {
    expect(readCapturesFile(text)).toEqual<ReadCapturesFileResult>({ kind: 'not-an-export' });
  });

  it('reports a newer version with its number', () => {
    const text = edited((raw) => (raw.version = 2));

    expect(readCapturesFile(text)).toEqual<ReadCapturesFileResult>({
      kind: 'newer-version',
      version: 2,
    });
  });

  it('rejects an unknown capture origin', () => {
    const file = read(edited((raw) => (entry(raw, 'captures', 0).origin = 'dreamed')));

    expect(file.unreadable).toEqual([
      {
        section: 'captures',
        index: 0,
        reason: { kind: 'invalid', detail: 'A stored capture holds an unknown origin: dreamed' },
      },
    ]);
    expect(file.captures.map(({ capture }) => capture.id)).toEqual([LIFTED.id, RECOGNIZED.id]);
  });

  it('rejects an unknown tag colour', () => {
    const file = read(edited((raw) => (entry(raw, 'tags', 1).colour = 'gold')));

    expect(file.unreadable).toEqual([
      {
        section: 'tags',
        index: 1,
        reason: { kind: 'invalid', detail: 'A stored tag holds an unknown colour: gold' },
      },
    ]);
    expect(file.tags).toEqual([GRAMMAR]);
  });

  it.each([
    [
      'a recognized capture without its note',
      2,
      (capture: Record<string, unknown>) => delete capture.note,
      'A stored capture lacks its note',
    ],
    [
      'a recognized capture without its confidence',
      2,
      (capture: Record<string, unknown>) => delete capture.confidence,
      'A stored capture lacks its confidence',
    ],
    [
      'a written capture carrying a note',
      0,
      (capture: Record<string, unknown>) => (capture.note = null),
      'A stored capture holds an unknown note for a written capture: null',
    ],
    [
      'a lifted capture carrying a confidence',
      1,
      (capture: Record<string, unknown>) => (capture.confidence = 0.5),
      'A stored capture holds an unknown confidence for a lifted capture: 0.5',
    ],
    [
      'a capture naming one tag twice',
      2,
      (capture: Record<string, unknown>) => (capture.tagIds = [KANJI.id, KANJI.id]),
      'A stored capture holds an unknown tag ids: tag-kanji,tag-kanji',
    ],
    [
      'a capture edited before it was taken',
      2,
      (capture: Record<string, unknown>) => (capture.editedAt = 150),
      'A stored capture holds an unknown edited time before its created time: 150',
    ],
    [
      'a capture whose region rect is in pixels rather than fractions of the page',
      2,
      (capture: Record<string, unknown>) =>
        (capture.anchor = {
          kind: 'region',
          regions: [{ index: 4, rect: { x: 120, y: 64, width: 88, height: 240 } }],
        }),
      'A stored capture holds an unknown region rect outside the page: 120,64,88,240',
    ],
  ])('rejects %s, as a stored row is rejected', (_what, index, change, detail) => {
    const file = read(edited((raw) => void change(entry(raw, 'captures', index))));

    expect(file.unreadable).toEqual([
      { section: 'captures', index, reason: { kind: 'invalid', detail } },
    ]);
    expect(file.captures).toHaveLength(2);
  });

  it('rejects a capture that lacks a field, and reads the rest', () => {
    const file = read(edited((raw) => delete entry(raw, 'captures', 1).text));

    expect(file.unreadable).toEqual([
      {
        section: 'captures',
        index: 1,
        reason: { kind: 'invalid', detail: 'A stored capture lacks its text' },
      },
    ]);
    expect(file.captures).toHaveLength(2);
  });

  it('rejects a book with a bad field, and with it every capture of that book', () => {
    const file = read(edited((raw) => (entry(raw, 'books', 1).language = 'xx')));

    expect(file.books.map((book) => book.key)).toEqual(['book-1']);
    expect(file.unreadable).toEqual([
      {
        section: 'books',
        index: 1,
        reason: { kind: 'invalid', detail: 'A stored book holds an unknown language: xx' },
      },
      { section: 'captures', index: 1, reason: { kind: 'unknown-book', bookKey: 'book-2' } },
      { section: 'captures', index: 2, reason: { kind: 'unknown-book', bookKey: 'book-2' } },
    ]);
    expect(file.captures.map(({ capture }) => capture.id)).toEqual([WRITTEN.id]);
  });

  it('rejects a capture whose book key names no book', () => {
    const file = read(edited((raw) => (entry(raw, 'captures', 0).bookKey = 'book-9')));

    expect(file.unreadable).toEqual([
      { section: 'captures', index: 0, reason: { kind: 'unknown-book', bookKey: 'book-9' } },
    ]);
  });

  it('drops a tag id the file does not hold, keeps the other tags, and reports the loss', () => {
    const file = read(edited((raw) => entries(raw, 'tags').pop()));

    expect(file.captures.map(({ capture }) => [capture.id, capture.tagIds])).toEqual([
      [WRITTEN.id, []],
      [LIFTED.id, []],
      [RECOGNIZED.id, [GRAMMAR.id]],
    ]);
    expect(file.droppedTags).toEqual([
      { captureId: WRITTEN.id, tagId: KANJI.id },
      { captureId: RECOGNIZED.id, tagId: KANJI.id },
    ]);
    expect(file.unreadable).toEqual([]);
  });

  it('rejects a repeated book key, tag id and capture id after the first', () => {
    const file = read(
      edited((raw) => {
        for (const section of ['books', 'tags', 'captures']) {
          const list = entries(raw, section);
          list.push(entry(raw, section, 0));
        }
      }),
    );

    expect(file.unreadable).toEqual([
      { section: 'books', index: 2, reason: { kind: 'repeated', id: 'book-1' } },
      { section: 'tags', index: 2, reason: { kind: 'repeated', id: GRAMMAR.id } },
      { section: 'captures', index: 3, reason: { kind: 'repeated', id: WRITTEN.id } },
    ]);
    expect([file.books.length, file.tags.length, file.captures.length]).toEqual([2, 2, 3]);
  });

  it('rejects an entry that is not an object', () => {
    const file = read(edited((raw) => (entries(raw, 'tags')[0] = 'kanji' as never)));

    expect(file.unreadable).toEqual([
      {
        section: 'tags',
        index: 0,
        reason: { kind: 'invalid', detail: 'A stored tag holds an unknown entry: kanji' },
      },
    ]);
  });
});
