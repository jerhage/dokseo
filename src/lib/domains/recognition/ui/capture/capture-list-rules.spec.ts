import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import {
  anchorsOf,
  listingOf,
  newestFirstOf,
  panelCapturesOf,
  readOf,
  storedIn,
} from './capture-list-rules';
import { READ, READING, UNLISTED } from './capture-read';
import type { CaptureListing } from './capture-read';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: pageRect(0, 0, 0.04, 0.02) }]);

function storedRow(id: string, text: string, createdAt: number, note: string | null): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: ANCHOR,
    text,
    note,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function card(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'written',
    tagIds: [],
    status: 'done',
    text: recognizedText(id, null),
    edited: false,
  };
}

function listingOver(captures: readonly Capture[]): CaptureListing {
  return { state: READ, captures, tags: [], unreadable: [], reload: () => undefined };
}

describe('listingOf', () => {
  it('answers the listing it was given, and a listing still being read when it has none', () => {
    const listing = listingOver([]);

    expect(listingOf(listing)).toBe(listing);
    expect(listingOf(undefined)).toBe(UNLISTED);
    expect(listingOf(undefined).state).toEqual(READING);
  });
});

describe('panelCapturesOf', () => {
  it('shows a card made while the list is read, and the stored rows ahead of it once read', () => {
    const made = [card('made')];

    expect(panelCapturesOf(UNLISTED, made).map((held) => held.id)).toEqual([captureId('made')]);

    const cards = panelCapturesOf(listingOver([storedRow('stored', 'old', 1, null)]), made);

    expect(cards.map((held) => held.id)).toEqual([captureId('stored'), captureId('made')]);
    expect(newestFirstOf(cards).map((held) => held.id)).toEqual([
      captureId('made'),
      captureId('stored'),
    ]);
    expect(anchorsOf(cards)).toEqual([ANCHOR, ANCHOR]);
  });
});

describe('storedIn', () => {
  it('answers the stored row of a capture and nothing for an unsaved card', () => {
    const row = storedRow('stored', 'old', 1, null);
    const listing = listingOver([row]);

    expect(storedIn(listing, captureId('stored'))).toBe(row);
    expect(storedIn(listing, captureId('made'))).toBeUndefined();
  });
});

describe('readOf', () => {
  it('marks the read captures with the notes their rows keep', () => {
    const listing = listingOver([storedRow('stored', '海', 1, 'the sea')]);
    const cards = panelCapturesOf(listing, []);

    expect(
      readOf(cards, listing).map((held) => (held.origin === 'written' ? null : held.note)),
    ).toEqual(['the sea']);
  });
});
