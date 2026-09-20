import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { at } from '$lib/shared/testing/at';
import {
  captureFromStored,
  editedCapture,
  oldestFirst,
  takenCapture,
  type Capture,
  type CaptureDraft,
  type StoredCapture,
} from './capture';

const BOOK = bookId('book-one');

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(13), rect: imageRect(10, 20, 100, 40) },
];

function draft(id: string, confidence: number | null = null): CaptureDraft {
  return { id: captureId(id), bookId: BOOK, regions: REGIONS, text: 'こっちに来て', confidence };
}

function taken(id: string, createdAt: number): Capture {
  return takenCapture(draft(id), createdAt);
}

describe('takenCapture', () => {
  it('stamps the draft with the moment it was taken', () => {
    const capture = takenCapture(draft('a', 0.8), 1_700_000_000_000);

    expect(capture).toEqual({
      id: 'a',
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.8,
      createdAt: 1_700_000_000_000,
      editedAt: null,
    });
  });

  it('keeps the image index and the rect rather than a page number', () => {
    const capture = takenCapture(draft('a'), 1);

    expect(at(capture.regions, 0).index).toBe(13);
    expect(at(capture.regions, 0).rect).toEqual(imageRect(10, 20, 100, 40));
  });
});

describe('captureFromStored', () => {
  it('reads a record written today unchanged', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored)).toEqual({
      ...stored,
      confidence: 0.5,
      createdAt: 42,
      editedAt: null,
    });
  });

  it('reads a record written before an edit was possible as never edited', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored).editedAt).toBeNull();
  });

  it('keeps the moment a stored record was edited', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
      editedAt: 99,
    };

    expect(captureFromStored(stored).editedAt).toBe(99);
  });

  it('fills an absent confidence with nothing rather than leaving the field missing', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      createdAt: 42,
    };

    expect(captureFromStored(stored).confidence).toBeNull();
  });

  it('dates a record written before the creation time existed to the beginning', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
    };

    expect(captureFromStored(stored).createdAt).toBe(0);
  });

  it('sorts a record with no creation time before every dated one', () => {
    const undated = captureFromStored({
      id: captureId('old'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'older',
    });

    const ordered = oldestFirst([taken('a', 5), undated, taken('b', 1)]);

    expect(ordered.map((capture) => capture.id)).toEqual(['old', 'b', 'a']);
  });
});

describe('editedCapture', () => {
  it('replaces the text and stamps the moment it was edited', () => {
    const edited = editedCapture(taken('a', 1), '  こっちに来い  ', 77);

    expect(edited.text).toBe('こっちに来い');
    expect(edited.editedAt).toBe(77);
  });

  it('keeps the previous text when the edit is blank', () => {
    const edited = editedCapture(taken('a', 1), '   ', 77);

    expect(edited.text).toBe('こっちに来て');
    expect(edited.editedAt).toBe(77);
  });

  it('keeps everything the reader did not change', () => {
    const before = taken('a', 1);

    const edited = editedCapture(before, 'べつのことば', 77);

    expect(edited.id).toBe(before.id);
    expect(edited.bookId).toBe(before.bookId);
    expect(edited.regions).toEqual(before.regions);
    expect(edited.createdAt).toBe(before.createdAt);
  });
});

describe('oldestFirst', () => {
  it('orders the captures by the moment each was taken', () => {
    const ordered = oldestFirst([taken('c', 30), taken('a', 10), taken('b', 20)]);

    expect(ordered.map((capture) => capture.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves the given list untouched', () => {
    const given = [taken('c', 30), taken('a', 10)];

    oldestFirst(given);

    expect(given.map((capture) => capture.id)).toEqual(['c', 'a']);
  });
});
