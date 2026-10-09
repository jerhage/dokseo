import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { Tag } from '../../domain/tag/tag';
import type { CaptureFind } from './capture-find';
import {
  paletteCursor,
  paletteInvite,
  paletteNote,
  paletteResults,
  rowAtCursor,
} from './search-palette-rules';
import type { PaletteQuery, PaletteSource } from './search-palette-rules';
import { effectiveScope } from './search-rows';

const READY: CaptureFind = readReady([]);

const UNREAD: CaptureFind = readFailed('Local storage failed: gone');

const ONE: SearchedBook = { id: bookId('one'), title: '海の本', language: 'ja', direction: 'rtl' };
const TWO: SearchedBook = { id: bookId('two'), title: '山の本', language: 'ja', direction: 'rtl' };

const SEA = tagId('sea');

const TAGS: readonly Tag[] = [{ id: SEA, name: '海タグ', colour: 'sky', createdAt: 0 }];

function written(
  id: string,
  book: SearchedBook,
  text: string,
  page: number,
  tagged = false,
): Capture {
  return {
    id: captureId(id),
    bookId: book.id,
    anchor: regionAnchor([{ index: imageIndex(page), rect: pageRect(0, 0, 0.01, 0.01) }]),
    text,
    origin: 'written',
    createdAt: 1,
    editedAt: null,
    tagIds: tagged ? [SEA] : [],
  };
}

const CAPTURES: readonly Capture[] = [
  written('a', ONE, '海が見える', 1, true),
  written('b', ONE, '海と空', 2),
  written('c', TWO, '海の山', 3, true),
];

function sourceOf(over: Partial<PaletteSource> = {}): PaletteSource {
  return {
    book: ONE.id,
    books: [ONE, TWO],
    covers: new Map(),
    counts: new Map(),
    tags: TAGS,
    captures: CAPTURES,
    passages: (a, b) => a.localeCompare(b),
    read: READY,
    room: 'wide',
    ...over,
  };
}

function askedOf(source: PaletteSource, over: Partial<PaletteQuery> = {}): PaletteQuery {
  return {
    present: true,
    query: '',
    scope: effectiveScope(source.book, 'book'),
    filter: 'everything',
    ...over,
  };
}

describe('paletteResults', () => {
  it('finds nothing before the dialog is present, whatever the query', () => {
    const source = sourceOf();

    expect(paletteResults(source, askedOf(source, { present: false, query: '海' })).rows).toEqual(
      [],
    );
  });

  it('finds the captures of the open book in the book scope', () => {
    const source = sourceOf();
    const found = paletteResults(source, askedOf(source, { query: '海' }));

    expect(found.rows.map((row) => row.kind)).toEqual(['capture', 'capture']);
  });

  it('finds titles and every book in the all scope, and nothing for a blank query', () => {
    const source = sourceOf();
    const found = paletteResults(source, askedOf(source, { scope: 'all', query: '海' }));

    expect(found.rows.map((row) => row.kind)).toEqual(['book', 'capture', 'capture', 'capture']);
    expect(paletteResults(source, askedOf(source, { scope: 'all', query: '  ' })).rows).toEqual([]);
  });

  it('searches every book when no book is open, even in the book scope', () => {
    const source = sourceOf({ book: null });
    const found = paletteResults(source, askedOf(source, { query: '海' }));

    expect(found.rows).toHaveLength(4);
  });

  it('finds only the captures a matching tag carries under the tag filter', () => {
    const source = sourceOf();
    const found = paletteResults(
      source,
      askedOf(source, { scope: 'all', query: '海', filter: 'tags' }),
    );

    expect(found.rows).toHaveLength(2);
    expect(found.rows.every((row) => row.kind === 'capture')).toBe(true);
  });
});

describe('paletteCursor', () => {
  it('has no cursor until one is set, and drops one past the rows', () => {
    expect(paletteCursor(NO_MATCH, 4)).toBe(NO_MATCH);
    expect(paletteCursor(1, 4)).toBe(1);
    expect(paletteCursor(3, 1)).toBe(NO_MATCH);
  });
});

describe('rowAtCursor', () => {
  it('opens the first row while no cursor is set, and the row at the cursor after', () => {
    const source = sourceOf();
    const { rows } = paletteResults(source, askedOf(source, { scope: 'all', query: '海' }));

    expect(rowAtCursor(rows, NO_MATCH)?.key).toBe(rows[0]?.key);
    expect(rowAtCursor(rows, 1)?.key).toBe(rows[1]?.key);
    expect(rowAtCursor([], NO_MATCH)).toBeUndefined();
  });
});

describe('paletteNote and paletteInvite', () => {
  it('says why nothing was found by the effective scope', () => {
    const inBook = sourceOf();
    const everywhere = sourceOf({ book: null });

    expect(paletteNote(inBook, askedOf(inBook, { query: 'zzz' }), 0)).not.toEqual(
      paletteNote(everywhere, askedOf(everywhere, { query: 'zzz' }), 0),
    );
    expect(paletteInvite(everywhere, askedOf(everywhere))).toBe(
      'Find in titles, text, tags and notes',
    );
  });

  it('invites a tag under the tag filter', () => {
    const source = sourceOf();

    expect(paletteInvite(source, askedOf(source, { filter: 'tags' }))).toBe('Find a tag');
  });

  it('invites by the room and the effective scope', () => {
    const narrow = sourceOf({ room: 'narrow' });
    const wide = sourceOf();

    expect(paletteInvite(narrow, askedOf(narrow))).toBe('Text, tags, notes');
    expect(paletteInvite(wide, askedOf(wide, { scope: 'all' }))).toBe(
      'Find in titles, text, tags and notes',
    );
  });

  it('notes a failed read and an empty search', () => {
    const unread = sourceOf({ read: UNREAD });
    const ready = sourceOf();

    expect(paletteNote(unread, askedOf(unread), 0)).toEqual({ kind: 'unread' });
    expect(paletteNote(ready, askedOf(ready, { query: 'zzz' }), 0).kind).toBe('nothing');
    expect(paletteNote(ready, askedOf(ready, { query: '海' }), 2)).toEqual({ kind: 'none' });
  });
});
