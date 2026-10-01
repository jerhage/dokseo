import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import { EMPTY_NOTE } from './capture-card';
import { cardOf, hitOf } from './capture-card-projection';
import type { Card, CardPlacing } from './capture-card-projection';
import type { PanelCapture } from './panel-capture';
import { NOTHING_READ } from './capture-view.svelte';

const TAG: Tag = namedTag(tagId('tag-1'), 'speech', 'copper', 1);

const PLACING: CardPlacing = {
  tags: [],
  book: bookId('book-1'),
  language: 'ja',
  progress: null,
  seekable: false,
  carried: null,
};

const AT_PAGE_THREE = regionAnchor([{ index: imageIndex(2), rect: imageRect(0, 0, 10, 10) }]);

function read(id: string, text: string, note: string | null = null): PanelCapture {
  return {
    id: captureId(id),
    anchor: AT_PAGE_THREE,
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
    anchor: AT_PAGE_THREE,
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

function pending(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: AT_PAGE_THREE,
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'pending',
  };
}

function blank(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: AT_PAGE_THREE,
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'empty',
  };
}

function broken(id: string, message: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: AT_PAGE_THREE,
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'failed',
    message,
  };
}

function cardFor(capture: PanelCapture, over: Partial<CardPlacing> = {}): Card {
  return cardOf(capture, null, { ...PLACING, ...over });
}

describe('cardOf', () => {
  it('marks a chapter place with the book language, and a page or chapterless place with none', () => {
    const cards = [
      lifted('c1', 'x', null, '第三章　海辺'),
      lifted('c2', 'y', null),
      read('c3', 'ねこ'),
    ];

    expect(cards.map((capture) => cardFor(capture).placeLanguage)).toEqual(['ja', null, null]);
  });

  it('marks no chapter place with a language when the route knows none', () => {
    expect(cardFor(lifted('c1', 'x', null, '第三章'), { language: null }).placeLanguage).toBeNull();
  });

  it('reads a pending capture as running', () => {
    expect(cardFor(pending('c1'))).toMatchObject({
      stateLabel: 'Reading…',
      tone: 'pending',
      editable: false,
    });
  });

  it('reports the model load as the note of a pending capture', () => {
    const card = cardFor(pending('c1'), {
      progress: { fraction: 0.5, source: 'network', loadedBytes: 1, totalBytes: 2 },
    });

    expect(card.note).toBe('Downloading the model · 50%');
  });

  it('names a done capture by its origin', () => {
    const captures = [read('c1', 'ねこ'), written('c2', 'mine'), lifted('c3', 'x', null)];

    expect(captures.map((capture) => cardFor(capture).stateLabel)).toEqual([
      'Read',
      'Note',
      'Lifted',
    ]);
  });

  it('invites writing into an empty note', () => {
    expect(cardFor(written('c1', '')).note).toBe(EMPTY_NOTE);
  });

  it('reports that nothing was read for an empty capture', () => {
    expect(cardFor(blank('c1'))).toMatchObject({
      stateLabel: 'No text',
      tone: 'empty',
      note: NOTHING_READ,
    });
  });

  it('carries the failure message of a failed capture', () => {
    expect(cardFor(broken('c1', 'the crop failed'))).toMatchObject({
      stateLabel: 'Failed',
      tone: 'failed',
      note: 'the crop failed',
    });
  });

  it('links a card to the image and region it was taken from, naming no capture id', () => {
    expect(cardFor(read('c1', 'ねこ')).href).toBe('/read/book-1?image=2&region=0,0,10,10');
  });

  it('carries the searched query into the link', () => {
    expect(cardFor(read('c1', 'ねこ'), { carried: 'cat' }).href).toBe(
      '/read/book-1?image=2&region=0,0,10,10&find=cat',
    );
  });

  it('links nowhere when no book is open', () => {
    expect(cardFor(read('c1', 'ねこ'), { book: null }).href).toBeNull();
  });

  it('links nowhere for a capture lifted from text', () => {
    expect(cardFor(lifted('c1', 'ねこ', null)).href).toBeNull();
  });

  it('shows the chapter a lifted capture came from as its place', () => {
    const captures = [lifted('c1', 'ねこ', null, '第一章'), lifted('c2', 'いぬ', null)];

    expect(captures.map((capture) => cardFor(capture).place)).toEqual(['第一章', 'no chapter']);
  });

  it('offers a passage only when the panel can seek', () => {
    const away = cardFor(lifted('c1', 'ねこ', null));
    const seeking = cardFor(lifted('c1', 'ねこ', null), { seekable: true });

    expect([away.passage, seeking.passage?.cfi]).toEqual([null, '/6/4!/2']);
  });

  it('heads an ebook card with its chapter in the book language, and gives no header to one without a chapter', () => {
    const captures = [lifted('c1', 'ねこ', null, '第一章'), lifted('c2', 'いぬ', null)];

    expect(captures.map((capture) => cardFor(capture, { seekable: true }).chapter)).toEqual([
      { text: '第一章', lang: 'ja' },
      null,
    ]);
  });

  it('gives an image capture no chapter header, and keeps its place and link', () => {
    const card = cardFor(read('c1', 'ねこ'), { seekable: true });

    expect(card).toMatchObject({ passage: null, chapter: null, place: 'p.003' });
    expect(card.href).not.toBeNull();
  });

  it('heads an empty or failed ebook card with its chapter', () => {
    const anchor = textAnchor('/6/4!/2', { exact: 'ねこ', prefix: '', suffix: '' }, '第一章');
    const captures = [
      { ...blank('c1'), anchor },
      { ...broken('c2', 'the crop failed'), anchor },
    ];

    expect(captures.map((capture) => cardFor(capture).chapter)).toEqual([
      { text: '第一章', lang: 'ja' },
      { text: '第一章', lang: 'ja' },
    ]);
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

    expect(cardFor(reading, { seekable: true }).chapter).toBeNull();
  });

  it('asks to add a note when the capture carries none', () => {
    expect(cardFor(read('c1', 'ねこ')).noteLabel).toBe('Add a note to the capture at p.003');
  });

  it('asks to edit the note when the capture carries one', () => {
    expect(cardFor(read('c1', 'ねこ', 'a cat')).noteLabel).toBe(
      'Edit the note on the capture at p.003',
    );
  });

  it('offers no note label on a written capture', () => {
    expect(cardFor(written('c1', 'mine')).noteLabel).toBeNull();
  });

  it('chips the tags the capture carries', () => {
    const tagged = { ...read('c1', 'ねこ'), tagIds: [TAG.id] };

    expect(cardFor(tagged, { tags: [TAG] }).tags).toEqual([
      { id: TAG.id, name: 'speech', colour: 'copper' },
    ]);
  });

  it('shows the marked runs of a hit in the text and the note', () => {
    const capture = read('c1', 'ねこです', 'ねこ');
    const hit = hitOf(capture, 'ねこ');

    const card = cardOf(capture, hit?.lines ?? null, PLACING);

    expect([card.segments, card.annotationSegments]).toEqual([
      [
        { text: 'ねこ', matched: true },
        { text: 'です', matched: false },
      ],
      [{ text: 'ねこ', matched: true }],
    ]);
  });
});

describe('hitOf', () => {
  it('finds a capture holding the query in its text', () => {
    const capture = read('c1', 'ねこです');

    expect(hitOf(capture, 'ねこ')).toMatchObject({ capture, anchor: capture.anchor });
  });

  it('finds a capture holding the query in its note', () => {
    expect(hitOf(read('c1', 'ねこ', 'a cat sat'), 'cat')).not.toBeNull();
  });

  it('finds a lifted capture holding the query in its note', () => {
    expect(hitOf(lifted('c1', 'ねこ', 'a cat sat'), 'cat')).not.toBeNull();
  });

  it('finds nothing in a capture that does not hold the query', () => {
    expect(hitOf(read('c1', 'ねこ'), 'いぬ')).toBeNull();
  });

  it('finds nothing in a capture still being read', () => {
    expect(hitOf(pending('c1'), 'ね')).toBeNull();
  });
});
