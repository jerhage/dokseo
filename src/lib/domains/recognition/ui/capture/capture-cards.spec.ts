import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureCards } from './capture-cards.svelte';
import type { CardSource } from './capture-cards.svelte';
import type { PanelCapture } from './panel-capture';
import { CAPTURE_SORT_KEY } from './capture-sort';

const BOOK = bookId('book-1');

class FakeStore implements StringStore {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

function region(index: number, x: number): ImageRegion {
  return { index: imageIndex(index), rect: imageRect(x, 0, 10, 10) };
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

function cardsOf(
  captures: readonly PanelCapture[],
  over: Partial<CardSource> = {},
  store: StringStore = new FakeStore(),
): CaptureCards {
  const held = source(captures, over);

  return new CaptureCards(
    () => held,
    () => store,
  );
}

function newestChosen(): FakeStore {
  const store = new FakeStore();
  store.setItem(CAPTURE_SORT_KEY, 'newest');
  return store;
}

function idsOf(panel: CaptureCards): readonly string[] {
  return panel.cards.map((card) => card.id);
}

describe('card search', () => {
  it('projects every capture while nothing is typed', () => {
    const panel = cardsOf([read('c1', 'ねこ'), read('c2', 'いぬ')]);

    expect([panel.searching, panel.cards.length, panel.cursor]).toEqual([false, 2, -1]);
  });

  it('keeps only the captures holding the query', () => {
    const panel = cardsOf([read('c1', 'ねこ'), read('c2', 'いぬ')]);
    panel.query = 'いぬ';

    expect(panel.cards.map((card) => card.id)).toEqual([captureId('c2')]);
  });

  it('matches a capture by its note', () => {
    const panel = cardsOf([read('c1', 'ねこ', 'a cat sat'), read('c2', 'いぬ')]);
    panel.query = 'cat';

    expect(panel.cards.map((card) => card.id)).toEqual([captureId('c1')]);
  });

  it('holds back a pending capture from the matches', () => {
    const panel = cardsOf([pending('c1'), read('c2', 'ねこ')]);
    panel.query = 'ね';

    expect(panel.cards.map((card) => card.id)).toEqual([captureId('c2')]);
  });

  it('orders the matches the way the book reads', () => {
    const panel = cardsOf([read('c1', 'ねこ', null, 0), read('c2', 'ねこ', null, 100)]);
    panel.query = 'ねこ';

    expect(panel.cards.map((card) => card.id)).toEqual([captureId('c2'), captureId('c1')]);
  });

  it('orders text matches by the passage order it is given', () => {
    const panel = cardsOf(
      [
        liftedAt('c3', 'ねこの尾', '/6/22!/2:0'),
        liftedAt('c1', 'ねこが来た', '/6/4!/2:0'),
        liftedAt('c2', 'ねこの目', '/6/14!/2:0'),
      ],
      { passages: byPassageOrder },
    );
    panel.query = 'ねこ';

    expect(panel.cards.map((card) => card.id)).toEqual([
      captureId('c1'),
      captureId('c2'),
      captureId('c3'),
    ]);
  });

  it('lists matches newest first when the reader sorts by newest', () => {
    const panel = cardsOf(
      [read('c1', 'ねこ', null, 100), read('c2', 'いぬ', null, 50), read('c3', 'ねこ', null, 0)],
      {},
      newestChosen(),
    );
    panel.query = 'ねこ';

    expect(idsOf(panel)).toEqual(['c3', 'c1']);
  });

  it('marks the matched run inside the text', () => {
    const panel = cardsOf([read('c1', 'ねこです')]);
    panel.query = 'ねこ';

    expect(panel.cards[0]?.segments).toEqual([
      { text: 'ねこ', matched: true },
      { text: 'です', matched: false },
    ]);
  });

  it('carries the query into the link of a match', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = 'ねこ';

    expect(panel.cards[0]?.href).toBe(
      '/read/book-1?image=2&region=0,0,10,10&find=%E3%81%AD%E3%81%93',
    );
  });

  it('trims the typed query before searching', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = '  ねこ  ';

    expect([panel.wanted, panel.cards.length]).toEqual(['ねこ', 1]);
  });
});

describe('card order', () => {
  it('lists image captures in book order while nothing is typed', () => {
    const panel = cardsOf([
      read('c1', 'ねこ', null, 0),
      read('c2', 'いぬ', null, 100),
      read('c3', 'とり', null, 50),
    ]);

    expect(idsOf(panel)).toEqual(['c2', 'c3', 'c1']);
  });

  it('lists text captures in the passage order it is given while nothing is typed', () => {
    const panel = cardsOf(
      [
        liftedAt('c3', 'ねこの尾', '/6/22!/2:0'),
        liftedAt('c1', 'いぬが来た', '/6/4!/2:0'),
        liftedAt('c2', 'とりの目', '/6/14!/2:0'),
      ],
      { passages: byPassageOrder },
    );

    expect(idsOf(panel)).toEqual(['c1', 'c2', 'c3']);
  });

  it('places a capture still being read at its place in the book, not at the top', () => {
    const panel = cardsOf([
      read('c1', 'ねこ', null, 100),
      read('c2', 'いぬ', null, 0),
      pending('c3', 50),
    ]);

    expect(idsOf(panel)).toEqual(['c1', 'c3', 'c2']);
  });

  it('lists every capture newest first when the reader sorts by newest', () => {
    const panel = cardsOf(
      [liftedAt('c1', 'いぬが来た', '/6/4!/2:0'), liftedAt('c3', 'ねこの尾', '/6/22!/2:0')],
      { passages: byPassageOrder },
      newestChosen(),
    );

    expect(idsOf(panel)).toEqual(['c3', 'c1']);
  });

  it('starts in book order when the stored choice is unknown', () => {
    const store = new FakeStore();
    store.setItem(CAPTURE_SORT_KEY, 'oldest');

    expect(cardsOf([], {}, store).sort).toBe('book');
  });

  it('reorders the cards and stores the choice when the reader sorts', () => {
    const store = new FakeStore();
    const panel = cardsOf([read('c1', 'ねこ', null, 100), read('c2', 'いぬ', null, 0)], {}, store);
    panel.sortBy('newest');

    expect([idsOf(panel), store.getItem(CAPTURE_SORT_KEY)]).toEqual([['c2', 'c1'], 'newest']);
    expect(cardsOf([], {}, store).sort).toBe('newest');
  });
});

describe('card reveal', () => {
  it('reveals the capture just made once, wherever it sits', () => {
    const panel = cardsOf([read('c1', 'ねこ'), pending('c2')]);
    const made = captureId('c2');

    expect([panel.reveals(made, made, true), panel.reveals(made, made, true)]).toEqual([
      true,
      false,
    ]);
  });

  it('reveals no capture other than the one just made', () => {
    const panel = cardsOf([read('c1', 'ねこ'), pending('c2')]);

    expect(panel.reveals(captureId('c1'), captureId('c2'), true)).toBe(false);
  });

  it('reveals nothing when no capture was made while the book is open', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);

    expect(panel.reveals(captureId('c1'), null, true)).toBe(false);
  });

  it('reveals the next capture made after one it has revealed', () => {
    const panel = cardsOf([read('c1', 'ねこ'), pending('c2')]);
    panel.reveals(captureId('c1'), captureId('c1'), true);

    expect(panel.reveals(captureId('c2'), captureId('c2'), true)).toBe(true);
  });

  it('holds the capture just made while the panel is hidden and reveals it when the panel shows', () => {
    const panel = cardsOf([read('c1', 'ねこ'), pending('c2')]);
    const made = captureId('c2');

    expect([
      panel.reveals(made, made, false),
      panel.reveals(made, made, false),
      panel.reveals(made, made, true),
      panel.reveals(made, made, true),
    ]).toEqual([false, false, true, false]);
  });

  it('reveals a capture held while hidden after the reader sorts, at its new place', () => {
    const panel = cardsOf([read('c1', 'ねこ', null, 0), pending('c2', 100)]);
    const made = captureId('c2');
    panel.reveals(made, made, false);
    panel.sortBy('newest');

    expect([idsOf(panel), panel.reveals(made, made, true)]).toEqual([['c2', 'c1'], true]);
  });
});

describe('card stepping', () => {
  it('opens the first match without replacing history', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = 'ねこ';

    expect(panel.jumpTo(0)).toEqual({
      kind: 'fresh',
      href: '/read/book-1?image=2&region=0,0,10,10&find=%E3%81%AD%E3%81%93',
    });
  });

  it('remembers the match it stepped to', () => {
    const panel = cardsOf([read('c1', 'ねこ'), read('c2', 'ねこ', null, 100)]);
    panel.query = 'ねこ';
    panel.jumpTo(1);

    expect(panel.cursor).toBe(1);
  });

  it('replaces history once a match has been stepped to', () => {
    const panel = cardsOf([read('c1', 'ねこ'), read('c2', 'ねこ', null, 100)]);
    panel.query = 'ねこ';
    panel.jumpTo(0);

    expect(panel.jumpTo(1)).toMatchObject({ kind: 'replacing' });
  });

  it('steps nowhere past the last match', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = 'ねこ';

    expect([panel.jumpTo(1), panel.cursor]).toEqual([{ kind: 'nowhere' }, -1]);
  });

  it('steps nowhere when the card links nowhere', () => {
    const panel = cardsOf([read('c1', 'ねこ')], { book: null });
    panel.query = 'ねこ';

    expect(panel.jumpTo(0)).toEqual({ kind: 'nowhere' });
  });

  it('forgets the cursor when the query changes', () => {
    const panel = cardsOf([read('c1', 'ねこ'), read('c2', 'ねこ', null, 100)]);
    panel.query = 'ねこ';
    panel.jumpTo(1);
    panel.query = 'ね';

    expect(panel.cursor).toBe(-1);
  });

  it('records no step while nothing is searched', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);

    expect([panel.jumpTo(0).kind, panel.cursor]).toEqual(['fresh', -1]);
  });
});
