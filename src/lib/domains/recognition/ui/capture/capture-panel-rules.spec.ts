import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import { taggedCapture } from '../../domain/tag/capture-tags';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { cardsOf, orderedCaptures, searchHits } from './capture-card-rules';
import type { CardSource } from './capture-card-rules';
import type { Card } from './capture-card-projection';
import { newestFirstOf, panelCapturesOf } from './capture-list-rules';
import { announcementOf, taggingCard, writtenIn } from './capture-panel-rules';
import { READ } from './capture-read';
import type { CaptureSort } from './capture-sort';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const CROWN = tagId('tag-crown');

function regions(index: number): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: pageRect(0, 0, 0.04, 0.02) }];
}

function storedRow(
  id: string,
  text: string,
  createdAt: number,
  note: string | null = null,
): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: regionAnchor(regions(createdAt)),
    text,
    note,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

function sourceOf(
  rows: readonly Capture[],
  unsaved: readonly PanelCapture[] = [],
  tags: readonly Tag[] = [],
  over: Partial<CardSource> = {},
): CardSource {
  const listing = { state: READ, captures: rows, tags, unreadable: [], reload: () => undefined };
  const captures = panelCapturesOf(listing, unsaved);
  return {
    captures,
    newestFirst: newestFirstOf(captures),
    tags,
    book: ONE,
    language: 'ja' as Language | null,
    progress: null,
    direction: 'rtl',
    passages: byCfi,
    seekable: false,
    ...over,
  };
}

function shownCards(source: CardSource, sort: CaptureSort = 'book', query = ''): readonly Card[] {
  const ordered = orderedCaptures(source, sort);
  const wanted = query.trim();
  return cardsOf(source, ordered, searchHits(ordered, wanted), wanted);
}

const LOADING_HALF = {
  fraction: 0.5,
  source: 'network',
  loadedBytes: 50,
  totalBytes: 100,
} as const;

function placedRow(id: string, x: number, createdAt: number): Capture {
  return {
    ...storedRow(id, id, createdAt),
    anchor: regionAnchor([{ index: imageIndex(3), rect: pageRect(x, 0, 40, 20) }]),
  };
}

function passageRow(id: string, cfi: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: textAnchor(cfi, { exact: id, prefix: '', suffix: '' }, null),
    text: id,
    note: null,
    origin: 'lifted',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function pending(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: regionAnchor(regions(9)),
    tagIds: [],
    origin: 'recognized',
    note: null,
    status: 'pending',
  };
}

const CROWN_TAG = namedTag(CROWN, 'crown', 'slate', 1);

describe('writtenIn', () => {
  it.each([
    ['the note for the note field', [storedRow('a', '先生', 1, 'teacher')], [], 'note', 'teacher'],
    ['the text for the text field', [storedRow('a', '先生', 1, 'teacher')], [], 'text', '先生'],
    ['an empty string for a card without a note', [storedRow('a', '先生', 1)], [], 'note', ''],
    ['an empty string for a card still being read', [], [pending('new')], 'text', ''],
  ] as const)('answers %s', (_case, rows, unsaved, field, written) => {
    expect(writtenIn(field, at(shownCards(sourceOf(rows, unsaved)), 0))).toBe(written);
  });
});

describe('the cards of a panel', () => {
  it('builds the cards from the capture list, the book language and the seekability', () => {
    const lifted = {
      ...storedRow('a', '先生', 1),
      anchor: textAnchor('/6/4', { exact: '先生', prefix: '', suffix: '' }, '第一章'),
    };
    const rows = [lifted];
    expect(at(shownCards(sourceOf(rows)), 0).passage).toBeNull();
    expect(at(shownCards(sourceOf(rows)), 0).placeLanguage).toBe('ja');

    const seeking = sourceOf(rows, [], [], { seekable: true, language: 'ko' });

    expect(at(shownCards(seeking), 0).passage).not.toBeNull();
    expect(at(shownCards(seeking), 0).placeLanguage).toBe('ko');
  });

  it('notes the model load on a capture still being read', () => {
    expect(at(shownCards(sourceOf([], [pending('new')])), 0).note).toBeNull();

    const loading = sourceOf([], [pending('new')], [], { progress: LOADING_HALF });

    expect(at(shownCards(loading), 0).note).not.toBeNull();
  });

  it('orders the captures of one page by the reading direction', () => {
    const rows = [placedRow('left', 0, 1), placedRow('right', 200, 2)];
    expect(shownCards(sourceOf(rows)).map((card) => card.id)).toEqual([
      captureId('right'),
      captureId('left'),
    ]);

    expect(shownCards(sourceOf(rows, [], [], { direction: 'ltr' })).map((card) => card.id)).toEqual(
      [captureId('left'), captureId('right')],
    );
  });

  it('orders the passages by the passage order it is given', () => {
    const rows = [passageRow('first', '/6/2', 1), passageRow('second', '/6/4', 2)];
    expect(shownCards(sourceOf(rows)).map((card) => card.id)).toEqual([
      captureId('first'),
      captureId('second'),
    ]);

    const reversed = sourceOf(rows, [], [], { passages: (a, b) => byCfi(b, a) });

    expect(shownCards(reversed).map((card) => card.id)).toEqual([
      captureId('second'),
      captureId('first'),
    ]);
  });

  it('lists the newest capture first when sorted by newest', () => {
    const rows = [storedRow('a', '先生', 1), storedRow('b', '後', 2)];

    expect(shownCards(sourceOf(rows), 'newest').map((card) => card.id)).toEqual([
      captureId('b'),
      captureId('a'),
    ]);
  });

  it('chips the tags a capture carries by their catalogue names', () => {
    const rows = [taggedCapture(storedRow('a', '先生', 1), CROWN)];

    expect(
      at(shownCards(sourceOf(rows, [], [CROWN_TAG])), 0).tags.map((chip) => chip.name),
    ).toEqual(['crown']);
  });
});

describe('announcementOf', () => {
  it('announces the model load only while a capture waits', () => {
    const cards = sourceOf([storedRow('a', '先生', 1)]).captures;
    expect(announcementOf(cards, null)).toBe('');

    const waiting = sourceOf([storedRow('a', '先生', 1)], [pending('new')]).captures;

    expect(announcementOf(waiting, null)).toBe('Reading the selection.');
    expect(announcementOf(waiting, LOADING_HALF)).toContain('50 percent');
  });
});

describe('taggingCard', () => {
  it('answers the card whose tags are being picked, and nothing for none', () => {
    const cards = shownCards(sourceOf([storedRow('a', '先生', 1)]));

    expect(taggingCard(cards, captureId('a'))?.id).toBe(captureId('a'));
    expect(taggingCard(cards, captureId('gone'))).toBeNull();
    expect(taggingCard(cards, null)).toBeNull();
  });
});
