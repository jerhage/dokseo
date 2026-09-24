import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, TagId } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import type { QuickFinds } from '../../domain/capture/quick-find';
import type { Tag } from '../../domain/tag/tag';
import { effectiveScope, paletteRows, searchedBooks } from './palette-rows';
import type { CaptureRow, PaletteInput, PaletteRow } from './palette-rows';

const ONE: SearchedBook = { id: bookId('one'), title: '海の本', language: 'ja', direction: 'rtl' };

const TWO: SearchedBook = { id: bookId('two'), title: '山の本', language: 'ko', direction: 'ltr' };

const IMAGERY: TagId = tagId('imagery');

const KEIGO: TagId = tagId('keigo');

const TAGS: readonly Tag[] = [
  { id: IMAGERY, name: '海-imagery', colour: 'sky', createdAt: 0 },
  { id: KEIGO, name: 'keigo', colour: 'plum', createdAt: 0 },
];

function onPage(index: number): Anchor {
  return regionAnchor([{ index: imageIndex(index), rect: imageRect(0, 0, 10, 10) }]);
}

function written(id: string, book: SearchedBook, text: string, anchor: Anchor): Capture {
  return {
    id: captureId(id),
    bookId: book.id,
    anchor,
    text,
    origin: 'written',
    createdAt: 1,
    editedAt: null,
    tagIds: [],
  };
}

function input(found: QuickFinds<Capture>, overrides: Partial<PaletteInput> = {}): PaletteInput {
  return {
    found,
    scope: 'all',
    book: null,
    covers: new Map(),
    counts: new Map(),
    tags: TAGS,
    query: '海',
    ...overrides,
  };
}

function captureAt(rows: readonly PaletteRow[], index: number): CaptureRow {
  const row = at(rows, index);
  if (row.kind !== 'capture') throw new Error(`Row ${index} is a ${row.kind}`);
  return row;
}

describe('paletteRows', () => {
  it('lists matched titles before captures across every upload', () => {
    const found = {
      books: [ONE],
      captures: [{ book: ONE, captures: [written('a', ONE, '海', onPage(0))] }],
    };

    const { rows, sections } = paletteRows(input(found));

    expect(rows.map((row) => row.kind)).toEqual(['book', 'capture']);
    expect(sections.map((group) => [group.label, group.from, group.rows.length])).toEqual([
      ['Books', 0, 1],
      ['Captures', 1, 1],
    ]);
  });

  it('drops matched titles inside one book', () => {
    const found = {
      books: [ONE],
      captures: [{ book: ONE, captures: [written('a', ONE, '海', onPage(0))] }],
    };

    const { rows, sections } = paletteRows(input(found, { scope: 'book', book: ONE.id }));

    expect(rows.map((row) => row.kind)).toEqual(['capture']);
    expect(sections.map((group) => [group.label, group.from])).toEqual([['Captures', 0]]);
  });

  it('leaves out an empty group', () => {
    const { rows, sections } = paletteRows(input({ books: [ONE], captures: [] }));

    expect(rows).toHaveLength(1);
    expect(sections.map((group) => group.label)).toEqual(['Books']);
  });

  it('describes a book by its cover, image count, language and marked title', () => {
    const covers = new Map<BookId, string>([[ONE.id, 'blob:one']]);
    const counts = new Map<BookId, number>([[ONE.id, 42]]);

    const row = at(
      paletteRows(input({ books: [ONE, TWO], captures: [] }, { covers, counts })).rows,
      0,
    );

    expect(row).toEqual({
      kind: 'book',
      key: ONE.id,
      href: '/read/one',
      language: 'ja',
      cover: 'blob:one',
      segments: [
        { text: '海', matched: true },
        { text: 'の本', matched: false },
      ],
      images: 42,
    });
    expect(at(paletteRows(input({ books: [TWO], captures: [] })).rows, 0)).toMatchObject({
      cover: null,
      images: null,
    });
  });

  it('jumps to the capture on its first page, carrying the query', () => {
    const found = {
      books: [],
      captures: [{ book: TWO, captures: [written('c-1', TWO, '海と山', onPage(2))] }],
    };

    const row = captureAt(paletteRows(input(found)).rows, 0);

    expect(row.href).toBe('/read/two?image=2&find=%E6%B5%B7&capture=c-1');
    expect(row.place).toBe('p.003');
    expect(row.language).toBe('ko');
  });

  it('opens the book with no page for a capture anchored in text', () => {
    const anchor = textAnchor('epubcfi(/6/2)', { exact: '海', prefix: '', suffix: '' });
    const found = {
      books: [],
      captures: [{ book: ONE, captures: [written('t', ONE, '海', anchor)] }],
    };

    const row = captureAt(paletteRows(input(found)).rows, 0);

    expect(row.href).toBe('/read/one');
    expect(row.place).toBe('no page');
  });

  it('names the book only when the capture is outside the current one', () => {
    const found = {
      books: [],
      captures: [
        { book: ONE, captures: [written('a', ONE, '海', onPage(0))] },
        { book: TWO, captures: [written('b', TWO, '海', onPage(0))] },
      ],
    };

    const { rows } = paletteRows(input(found, { book: ONE.id }));

    expect(captureAt(rows, 0).title).toBeNull();
    expect(captureAt(rows, 1).title).toBe('山の本');
  });

  it('lights the tags whose name matches and drops unknown tags', () => {
    const tagged: Capture = {
      ...written('a', ONE, '川', onPage(0)),
      tagIds: [KEIGO, tagId('gone'), IMAGERY],
    };

    const row = captureAt(
      paletteRows(input({ books: [], captures: [{ book: ONE, captures: [tagged] }] })).rows,
      0,
    );

    expect(row.chips.map((chip) => [chip.name, chip.matched])).toEqual([
      ['keigo', false],
      ['海-imagery', true],
    ]);
  });

  it('marks the query in the text and in the note', () => {
    const noted: Capture = {
      id: captureId('n'),
      bookId: ONE.id,
      anchor: onPage(0),
      text: '青い海',
      origin: 'recognized',
      confidence: null,
      note: '海の色',
      createdAt: 1,
      editedAt: null,
      tagIds: [],
    };

    const row = captureAt(
      paletteRows(input({ books: [], captures: [{ book: ONE, captures: [noted] }] })).rows,
      0,
    );

    expect(row.segments).toEqual([
      { text: '青い', matched: false },
      { text: '海', matched: true },
    ]);
    expect(row.note).toEqual([
      { text: '海', matched: true },
      { text: 'の色', matched: false },
    ]);
  });
});

describe('effectiveScope', () => {
  it('searches every upload when no book is open', () => {
    expect(effectiveScope(null, 'book')).toBe('all');
  });

  it('keeps the chosen scope inside a book', () => {
    expect(effectiveScope(ONE.id, 'book')).toBe('book');
    expect(effectiveScope(ONE.id, 'all')).toBe('all');
  });
});

describe('searchedBooks', () => {
  it('keeps only the open book inside one book', () => {
    expect(searchedBooks([ONE, TWO], TWO.id, 'book')).toEqual([TWO]);
  });

  it('keeps every book across every upload', () => {
    expect(searchedBooks([ONE, TWO], TWO.id, 'all')).toEqual([ONE, TWO]);
  });
});
