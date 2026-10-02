import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureList } from './capture-list.svelte';
import { READ, READING } from './capture-read';
import type { CaptureListing } from './capture-read';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

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

function ids(list: CaptureList): readonly CaptureId[] {
  return list.captures.map((held) => held.id);
}

function listOver(listing: { current: CaptureListing | undefined }): CaptureList {
  return new CaptureList(() => listing.current);
}

describe('CaptureList', () => {
  it('shows a card made while the list is read, and the stored rows ahead of it once read', () => {
    const listing: { current: CaptureListing | undefined } = { current: undefined };
    const list = listOver(listing);
    list.open(ONE);
    list.unsaved.put(card('made'));

    expect(list.listing.state).toEqual(READING);
    expect(ids(list)).toEqual([captureId('made')]);

    listing.current = {
      state: READ,
      captures: [storedRow('stored', 'old', 1, null)],
      tags: [],
      unreadable: [],
      reload: () => undefined,
    };

    expect(ids(list)).toEqual([captureId('stored'), captureId('made')]);
    expect(list.count).toBe(2);
    expect(list.newestFirst.map((held) => held.id)).toEqual([
      captureId('made'),
      captureId('stored'),
    ]);
  });

  it('answers the stored row of a capture and nothing for an unsaved card', () => {
    const row = storedRow('stored', 'old', 1, null);
    const list = listOver({
      current: { state: READ, captures: [row], tags: [], unreadable: [], reload: () => undefined },
    });
    list.unsaved.put(card('made'));

    expect(list.stored(captureId('stored'))).toBe(row);
    expect(list.stored(captureId('made'))).toBeUndefined();
  });

  it('marks the read captures with the notes their rows keep', () => {
    const list = listOver({
      current: {
        state: READ,
        captures: [storedRow('stored', '海', 1, 'the sea')],
        tags: [],
        unreadable: [],
        reload: () => undefined,
      },
    });

    expect(list.read.map((held) => (held.origin === 'written' ? null : held.note))).toEqual([
      'the sea',
    ]);
  });

  it('forgets the book, the unsaved cards and the latest card when the reader leaves', () => {
    const list = listOver({ current: undefined });
    list.open(ONE);
    list.unsaved.put(card('made'));

    list.forget();

    expect(list.book).toBeNull();
    expect(list.captures).toEqual([]);
    expect(list.latest).toBeNull();
  });

  it('starts each book with no unsaved card', () => {
    const list = listOver({ current: undefined });
    list.open(ONE);
    list.unsaved.put(card('made'));

    list.open(bookId('book-two'));

    expect(list.captures).toEqual([]);
    expect(list.book).toBe(bookId('book-two'));
  });
});
