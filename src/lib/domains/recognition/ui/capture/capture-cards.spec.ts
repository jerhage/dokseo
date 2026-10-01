import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import { EMPTY_NOTE } from './capture-card';
import { CaptureCards } from './capture-cards.svelte';
import type { CardSource } from './capture-cards.svelte';
import type { PanelCapture } from './panel-capture';
import { CAPTURE_SORT_KEY } from './capture-sort';
import { NOTHING_READ } from './capture-view.svelte';

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

const TAG: Tag = namedTag(tagId('tag-1'), 'speech', 'copper', 1);

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

function written(id: string, text: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, 0)]),
    tagIds: [],
    origin: 'written',
    status: 'done',
    text: recognizedText(text),
    edited: false,
  };
}

function lifted(
  id: string,
  text: string,
  note: string | null,
  chapter: string | null = null,
): PanelCapture {
  return {
    id: captureId(id),
    anchor: textAnchor('/6/4!/2', { exact: text, prefix: '', suffix: '' }, chapter),
    tagIds: [],
    origin: 'lifted',
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

function blank(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, 0)]),
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'empty',
  };
}

function broken(id: string, message: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, 0)]),
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'failed',
    message,
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

describe('card projection', () => {
  it('marks a chapter place with the book language, and a page or chapterless place with none', () => {
    const cards = cardsOf([
      lifted('c1', 'x', null, '第三章　海辺'),
      lifted('c2', 'y', null),
      read('c3', 'ねこ'),
    ]).cards;

    expect(cards.map((card) => [card.id, card.placeLanguage])).toEqual([
      ['c3', null],
      ['c1', 'ja'],
      ['c2', null],
    ]);
  });

  it('marks no chapter place with a language when the route knows none', () => {
    const cards = cardsOf([lifted('c1', 'x', null, '第三章')], { language: null }).cards;

    expect(cards[0]?.placeLanguage).toBeNull();
  });

  it('reads a pending capture as running', () => {
    const cards = cardsOf([pending('c1')]).cards;

    expect(cards[0]).toMatchObject({ stateLabel: 'Reading…', tone: 'pending', editable: false });
  });

  it('reports the model load as the note of a pending capture', () => {
    const cards = cardsOf([pending('c1')], {
      progress: { fraction: 0.5, source: 'network', loadedBytes: 1, totalBytes: 2 },
    }).cards;

    expect(cards[0]?.note).toBe('Downloading the model · 50%');
  });

  it('names a done capture by its origin', () => {
    const cards = cardsOf([
      read('c1', 'ねこ'),
      written('c2', 'mine'),
      lifted('c3', 'x', null),
    ]).cards;

    expect(cards.map((card) => card.stateLabel)).toEqual(['Read', 'Note', 'Lifted']);
  });

  it('invites writing into an empty note', () => {
    const cards = cardsOf([written('c1', '')]).cards;

    expect(cards[0]?.note).toBe(EMPTY_NOTE);
  });

  it('reports that nothing was read for an empty capture', () => {
    const cards = cardsOf([blank('c1')]).cards;

    expect(cards[0]).toMatchObject({ stateLabel: 'No text', tone: 'empty', note: NOTHING_READ });
  });

  it('carries the failure message of a failed capture', () => {
    const cards = cardsOf([broken('c1', 'the crop failed')]).cards;

    expect(cards[0]).toMatchObject({
      stateLabel: 'Failed',
      tone: 'failed',
      note: 'the crop failed',
    });
  });

  it('links a card to the image and region it was taken from, naming no capture id', () => {
    const cards = cardsOf([read('c1', 'ねこ')]).cards;

    expect(cards[0]?.href).toBe('/read/book-1?image=2&region=0,0,10,10');
  });

  it('links nowhere when no book is open', () => {
    const cards = cardsOf([read('c1', 'ねこ')], { book: null }).cards;

    expect(cards[0]?.href).toBeNull();
  });

  it('links nowhere for a capture lifted from text', () => {
    const cards = cardsOf([lifted('c1', 'ねこ', null)]).cards;

    expect(cards[0]?.href).toBeNull();
  });

  it('shows the chapter a lifted capture came from as its place', () => {
    const cards = cardsOf([lifted('c1', 'ねこ', null, '第一章'), lifted('c2', 'いぬ', null)]).cards;

    expect(cards.map((card) => card.place)).toEqual(['第一章', 'no chapter']);
  });

  it('offers a passage only when the panel can seek', () => {
    const away = cardsOf([lifted('c1', 'ねこ', null)]).cards;
    const seeking = cardsOf([lifted('c1', 'ねこ', null)], { seekable: true }).cards;

    expect([away[0]?.passage, seeking[0]?.passage?.cfi]).toEqual([null, '/6/4!/2']);
  });

  it('heads an ebook card with its chapter in the book language, and gives no header to one without a chapter', () => {
    const cards = cardsOf([lifted('c1', 'ねこ', null, '第一章'), lifted('c2', 'いぬ', null)], {
      seekable: true,
    }).cards;

    expect(cards.map((card) => card.chapter)).toEqual([{ text: '第一章', lang: 'ja' }, null]);
  });

  it('gives an image capture no chapter header, and keeps its place and link', () => {
    const cards = cardsOf([read('c1', 'ねこ')], { seekable: true }).cards;

    expect(cards[0]).toMatchObject({ passage: null, chapter: null, place: 'p.003' });
    expect(cards[0]?.href).not.toBeNull();
  });

  it('leaves the chapter header off a card still being read', () => {
    const reading: PanelCapture = {
      id: captureId('c1'),
      anchor: textAnchor('/6/4!/2', { exact: 'ねこ', prefix: '', suffix: '' }, '第一章'),
      tagIds: [],
      origin: 'lifted',
      note: null,
      status: 'pending',
    };

    expect(cardsOf([reading], { seekable: true }).cards[0]?.chapter).toBeNull();
  });

  it('asks to add a note when the capture carries none', () => {
    const cards = cardsOf([read('c1', 'ねこ')]).cards;

    expect(cards[0]?.noteLabel).toBe('Add a note to the capture at p.003');
  });

  it('asks to edit the note when the capture carries one', () => {
    const cards = cardsOf([read('c1', 'ねこ', 'a cat')]).cards;

    expect(cards[0]?.noteLabel).toBe('Edit the note on the capture at p.003');
  });

  it('offers no note label on a written capture', () => {
    const cards = cardsOf([written('c1', 'mine')]).cards;

    expect(cards[0]?.noteLabel).toBeNull();
  });

  it('chips the tags the capture carries', () => {
    const tagged = { ...read('c1', 'ねこ'), tagIds: [TAG.id] };
    const cards = cardsOf([tagged], { tags: [TAG] }).cards;

    expect(cards[0]?.tags).toEqual([{ id: TAG.id, name: 'speech', colour: 'copper' }]);
  });
});

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
