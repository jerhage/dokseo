import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { NO_MATCH } from '../../domain/capture/match-stepping';
import type { Tag } from '../../domain/tag/tag';
import type { CaptureFind } from './capture-find';
import type { SearchRoom } from './search-copy';
import { SearchPalette } from './search-palette.svelte';

const READY: CaptureFind = readReady([]);

const UNREAD: CaptureFind = readFailed('Local storage failed: gone');

const ONE: SearchedBook = {
  id: bookId('one'),
  title: '海の本',
  language: 'ja',
  direction: 'rtl',
  removed: false,
};
const TWO: SearchedBook = {
  id: bookId('two'),
  title: '山の本',
  language: 'ja',
  direction: 'rtl',
  removed: false,
};

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
    anchor: regionAnchor([{ index: imageIndex(page), rect: imageRect(0, 0, 10, 10) }]),
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

type Held = {
  book: BookId | null;
  read: CaptureFind;
  room: SearchRoom;
};

function palette(held: Held = { book: ONE.id, read: READY, room: 'wide' }): SearchPalette {
  return new SearchPalette(() => ({
    book: held.book,
    books: [ONE, TWO],
    covers: new Map(),
    counts: new Map(),
    tags: TAGS,
    captures: CAPTURES,
    passages: (a, b) => a.localeCompare(b),
    read: held.read,
    room: held.room,
  }));
}

function keys(found: SearchPalette): readonly string[] {
  return found.results.rows.map((row) => row.key);
}

function shortcut(shiftKey = false): {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
} {
  return { key: 'k', metaKey: true, ctrlKey: false, shiftKey, isComposing: false, keyCode: 75 };
}

describe('SearchPalette', () => {
  it('finds nothing before it is revealed, whatever the query', () => {
    const found = palette();
    found.query = '海';

    expect(found.results.rows).toEqual([]);
  });

  it('finds the captures of the open book once revealed in the book scope', () => {
    const found = palette();
    found.reveal('book');
    found.query = '海';

    expect(found.shown).toBe(true);
    expect(found.results.rows.map((row) => row.kind)).toEqual(['capture', 'capture']);
  });

  it('finds titles and every book in the all scope', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';

    expect(found.results.rows.map((row) => row.kind)).toEqual([
      'book',
      'capture',
      'capture',
      'capture',
    ]);

    found.query = '  ';

    expect(found.results.rows).toEqual([]);
  });

  it('searches every book when no book is open, even in the book scope', () => {
    const found = palette({ book: null, read: READY, room: 'wide' });
    found.reveal('book');
    found.query = '海';

    expect(found.results.rows).toHaveLength(4);
  });

  it('finds nothing once the dialog has gone, and shows nothing once hidden', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';

    found.hide();
    expect(found.shown).toBe(false);
    expect(found.results.rows).toHaveLength(4);

    found.gone();
    expect(found.results.rows).toEqual([]);
  });

  it('starts with no cursor and opens the first row at it', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';

    expect(found.cursor).toBe(NO_MATCH);
    expect(found.rowAtCursor()?.key).toBe(keys(found)[0]);

    found.query = 'zzz';

    expect(found.rowAtCursor()).toBeUndefined();
  });

  it('moves the cursor, answers where it landed, and stops at the last row', () => {
    const found = palette();
    found.reveal('book');
    found.query = '海';

    expect(found.moveBy(1)).toBe(0);
    expect(found.moveBy(1)).toBe(1);
    expect(found.moveBy(1)).toBe(1);
    expect(found.cursor).toBe(1);
    expect(found.rowAtCursor()?.key).toBe(keys(found)[1]);
  });

  it('drops a cursor past the rows a narrower query leaves', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';

    expect(found.moveBy(-1)).toBe(3);

    found.query = '空';

    expect(found.cursor).toBe(NO_MATCH);
  });

  it.each([
    ['choosing a scope', (found: SearchPalette) => found.choose('all')],
    ['revealing', (found: SearchPalette) => found.reveal('book')],
    ['restarting', (found: SearchPalette) => found.restart()],
    ['toggling the tag filter', (found: SearchPalette) => found.toggleTags()],
  ])('drops the cursor on %s', (_name, act) => {
    const found = palette();
    found.reveal('book');
    found.query = '海';
    found.moveBy(1);

    act(found);

    expect(found.cursor).toBe(NO_MATCH);
  });

  it('finds only the captures a matching tag carries under the tag filter', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';

    found.toggleTags();

    expect(keys(found)).toHaveLength(2);
    expect(found.results.rows.every((row) => row.kind === 'capture')).toBe(true);
  });

  it('moves from the shown cursor, not from a row a narrower query dropped', () => {
    const found = palette();
    found.reveal('all');
    found.query = '海';
    found.moveBy(-1);

    found.query = '海の';

    expect(found.results.rows).toHaveLength(2);
    expect(found.moveBy(1)).toBe(0);
  });

  it('says why nothing was found by the effective scope', () => {
    const inBook = palette();
    inBook.reveal('book');
    inBook.query = 'zzz';
    const everywhere = palette({ book: null, read: READY, room: 'wide' });
    everywhere.reveal('book');
    everywhere.query = 'zzz';

    expect(inBook.note).not.toEqual(everywhere.note);
    expect(everywhere.invite).toBe('Find in titles, text, tags and notes');
  });

  it('toggles the tag filter and invites a tag', () => {
    const found = palette();
    found.reveal('book');

    found.toggleTags();
    expect(found.filter).toBe('tags');
    expect(found.invite).toBe('Find a tag');

    found.toggleTags();
    expect(found.filter).toBe('everything');
  });

  it('invites by the room and the effective scope', () => {
    const held: Held = { book: ONE.id, read: READY, room: 'narrow' };
    const found = palette(held);
    found.reveal('book');
    expect(found.invite).toBe('Text, tags, notes');

    held.room = 'wide';
    found.choose('all');
    expect(found.invite).toBe('Find in titles, text, tags and notes');
  });

  it('notes a failed read and an empty search', () => {
    const held: Held = { book: ONE.id, read: UNREAD, room: 'wide' };
    const found = palette(held);
    found.reveal('book');
    expect(found.note).toEqual({ kind: 'unread' });

    held.read = READY;
    found.query = 'zzz';
    expect(found.note.kind).toBe('nothing');

    found.query = '海';
    expect(found.note).toEqual({ kind: 'none' });
  });

  it('reads the shortcut against its own state and the open book', () => {
    const held: Held = { book: ONE.id, read: READY, room: 'wide' };
    const found = palette(held);

    expect(found.keyFor(shortcut())).toEqual({ kind: 'reveal', scope: 'book' });

    found.reveal('book');
    expect(found.keyFor(shortcut())).toEqual({ kind: 'hide' });
    expect(found.keyFor(shortcut(true))).toEqual({ kind: 'choose', scope: 'all' });
    found.choose('all');
    expect(found.keyFor(shortcut())).toEqual({ kind: 'choose', scope: 'book' });

    held.book = null;
    found.hide();
    expect(found.keyFor(shortcut())).toEqual({ kind: 'reveal', scope: 'all' });
  });
});
