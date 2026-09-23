import { describe, expect, it } from 'vitest';
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
import type { PanelCapture } from './capture-collection.svelte';
import { NOTHING_READ } from './capture-view.svelte';

const BOOK = bookId('book-1');

const TAG: Tag = namedTag(tagId('tag-1'), 'speech', 'ember', 1);

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

function lifted(id: string, text: string, note: string | null): PanelCapture {
  return {
    id: captureId(id),
    anchor: textAnchor('/6/4!/2', { exact: text, prefix: '', suffix: '' }),
    tagIds: [],
    origin: 'lifted',
    note,
    status: 'done',
    text: recognizedText(text),
    edited: false,
  };
}

function pending(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor([region(2, 0)]),
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
    newestFirst: captures,
    tags: [],
    book: BOOK,
    progress: null,
    direction: 'rtl',
    seekable: false,
    ...over,
  };
}

function cardsOf(captures: readonly PanelCapture[], over: Partial<CardSource> = {}): CaptureCards {
  const held = source(captures, over);

  return new CaptureCards(() => held);
}

describe('card projection', () => {
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

  it('links a card to the page it was taken from', () => {
    const cards = cardsOf([read('c1', 'ねこ')]).cards;

    expect(cards[0]?.href).toBe('/read/book-1?image=2&capture=c1');
  });

  it('links nowhere when no book is open', () => {
    const cards = cardsOf([read('c1', 'ねこ')], { book: null }).cards;

    expect(cards[0]?.href).toBeNull();
  });

  it('links nowhere for a capture lifted from text', () => {
    const cards = cardsOf([lifted('c1', 'ねこ', null)]).cards;

    expect(cards[0]?.href).toBeNull();
  });

  it('offers a passage only when the panel can seek', () => {
    const away = cardsOf([lifted('c1', 'ねこ', null)]).cards;
    const seeking = cardsOf([lifted('c1', 'ねこ', null)], { seekable: true }).cards;

    expect([away[0]?.passage, seeking[0]?.passage?.cfi]).toEqual([null, '/6/4!/2']);
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

    expect(cards[0]?.tags).toEqual([{ id: TAG.id, name: 'speech', colour: 'ember' }]);
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

    expect(panel.cards[0]?.href).toBe('/read/book-1?image=2&find=%E3%81%AD%E3%81%93&capture=c1');
  });

  it('trims the typed query before searching', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = '  ねこ  ';

    expect([panel.wanted, panel.cards.length]).toEqual(['ねこ', 1]);
  });
});

describe('card stepping', () => {
  it('opens the first match without replacing history', () => {
    const panel = cardsOf([read('c1', 'ねこ')]);
    panel.query = 'ねこ';

    expect(panel.jumpTo(0)).toEqual({
      kind: 'fresh',
      href: '/read/book-1?image=2&find=%E3%81%AD%E3%81%93&capture=c1',
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
