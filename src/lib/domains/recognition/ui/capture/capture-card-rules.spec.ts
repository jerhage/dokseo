import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { Card } from './capture-card-projection';
import { cardsOf, cursorOf, jumpAt, orderedCaptures, searchHits } from './capture-card-rules';
import type { CardSource } from './capture-card-rules';
import type { CaptureSort } from './capture-sort';
import type { PanelCapture } from './panel-capture';

const BOOK = bookId('book-1');

function region(index: number, x: number): ImageRegion {
  return { index: imageIndex(index), rect: pageRect(x, 0, 10, 10) };
}

function read(id: string, text: string, note: string | null = null, x = 0): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, x)]),
    tagIds: [],
    origin: 'recognized',
    note,
    status: 'done',
    text: recognizedText(text),
    edited: false,
  };
}

function liftedAt(id: string, text: string, cfi: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: textAnchor(cfi, { exact: text, prefix: '', suffix: '' }, null),
    tagIds: [],
    origin: 'lifted',
    note: null,
    status: 'done',
    text: recognizedText(text),
    edited: false,
  };
}

const PASSAGE_ORDER = ['/6/4!/2:0', '/6/14!/2:0', '/6/22!/2:0'];

function byPassageOrder(earlier: string, later: string): number {
  return PASSAGE_ORDER.indexOf(earlier) - PASSAGE_ORDER.indexOf(later);
}

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

function pending(id: string, x = 0): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, x)]),
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'pending',
  };
}

function source(captures: readonly PanelCapture[], over: Partial<CardSource> = {}): CardSource {
  return {
    captures,
    newestFirst: captures.toReversed(),
    tags: [],
    book: BOOK,
    language: 'ja',
    progress: null,
    direction: 'rtl',
    passages: byCfi,
    seekable: false,
    ...over,
  };
}

function shown(
  captures: readonly PanelCapture[],
  query = '',
  sort: CaptureSort = 'book',
  over: Partial<CardSource> = {},
): readonly Card[] {
  const held = source(captures, over);
  const ordered = orderedCaptures(held, sort);
  const wanted = query.trim();
  return cardsOf(held, ordered, searchHits(ordered, wanted), wanted);
}

function idsOf(cards: readonly Card[]): readonly string[] {
  return cards.map((card) => card.id);
}

describe('card search', () => {
  it('projects every capture while nothing is typed', () => {
    const cards = shown([read('c1', 'ねこ'), read('c2', 'いぬ')]);

    expect(cards).toHaveLength(2);
    expect(searchHits(orderedCaptures(source([read('c1', 'ねこ')]), 'book'), '')).toBeNull();
  });

  it('keeps only the captures holding the query', () => {
    const cards = shown([read('c1', 'ねこ'), read('c2', 'いぬ')], 'いぬ');

    expect(cards.map((card) => card.id)).toEqual([captureId('c2')]);
  });

  it('orders the matches the way the book reads', () => {
    const cards = shown([read('c1', 'ねこ', null, 0), read('c2', 'ねこ', null, 100)], 'ねこ');

    expect(cards.map((card) => card.id)).toEqual([captureId('c2'), captureId('c1')]);
  });

  it('marks the matched run inside the text', () => {
    const cards = shown([read('c1', 'ねこです')], 'ねこ');

    expect(cards[0]?.segments).toEqual([
      { text: 'ねこ', matched: true },
      { text: 'です', matched: false },
    ]);
  });

  it('carries the query into the link of a match', () => {
    const cards = shown([read('c1', 'ねこ')], 'ねこ');

    expect(cards[0]?.href).toBe('/read/book-1?image=2&region=0,0,10,10&find=%E3%81%AD%E3%81%93');
  });
});

describe('card order', () => {
  it('lists image captures in book order while nothing is typed', () => {
    const cards = shown([
      read('c1', 'ねこ', null, 0),
      read('c2', 'いぬ', null, 100),
      read('c3', 'とり', null, 50),
      pending('c4', 75),
    ]);

    expect(idsOf(cards)).toEqual(['c2', 'c4', 'c3', 'c1']);
  });

  it('lists text captures in the passage order it is given while nothing is typed', () => {
    const cards = shown(
      [
        liftedAt('c3', 'ねこの尾', '/6/22!/2:0'),
        liftedAt('c1', 'いぬが来た', '/6/4!/2:0'),
        liftedAt('c2', 'とりの目', '/6/14!/2:0'),
      ],
      '',
      'book',
      { passages: byPassageOrder },
    );

    expect(idsOf(cards)).toEqual(['c1', 'c2', 'c3']);
  });

  it('lists every capture newest first when the reader sorts by newest', () => {
    const cards = shown(
      [liftedAt('c1', 'いぬが来た', '/6/4!/2:0'), liftedAt('c3', 'ねこの尾', '/6/22!/2:0')],
      '',
      'newest',
      { passages: byPassageOrder },
    );

    expect(idsOf(cards)).toEqual(['c3', 'c1']);
  });
});

describe('card cursor', () => {
  it('keeps the stepped match while the query it was stepped on stands', () => {
    expect(cursorOf({ query: 'ねこ', at: 1 }, 'ねこ')).toBe(1);
  });

  it('forgets the cursor when the query changes', () => {
    expect(cursorOf({ query: 'ねこ', at: 1 }, 'ね')).toBe(-1);
  });

  it('has no cursor while nothing is searched or nothing was stepped to', () => {
    expect(cursorOf({ query: 'ねこ', at: 1 }, '')).toBe(-1);
    expect(cursorOf(null, 'ねこ')).toBe(-1);
  });
});

describe('card stepping', () => {
  it('opens the first match without replacing history', () => {
    const cards = shown([read('c1', 'ねこ')], 'ねこ');

    expect(jumpAt(cards, 0, -1)).toEqual({
      kind: 'fresh',
      href: '/read/book-1?image=2&region=0,0,10,10&find=%E3%81%AD%E3%81%93',
    });
  });

  it('replaces history once a match has been stepped to', () => {
    const cards = shown([read('c1', 'ねこ'), read('c2', 'ねこ', null, 100)], 'ねこ');

    expect(jumpAt(cards, 1, 0)).toMatchObject({ kind: 'replacing' });
  });

  it('steps nowhere past the last match', () => {
    const cards = shown([read('c1', 'ねこ')], 'ねこ');

    expect(jumpAt(cards, 1, -1)).toEqual({ kind: 'nowhere' });
  });

  it('steps nowhere when the card links nowhere', () => {
    const cards = shown([read('c1', 'ねこ')], 'ねこ', 'book', { book: null });

    expect(jumpAt(cards, 0, -1)).toEqual({ kind: 'nowhere' });
  });
});
