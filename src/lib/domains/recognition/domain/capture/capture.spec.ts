import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { at } from '$lib/shared/testing/at';
import {
  captureFromStored,
  editedCapture,
  notedCapture,
  oldestFirst,
  takenCapture,
} from './capture';
import type {
  Capture,
  CaptureDraft,
  LiftedCapture,
  RecognizedCapture,
  StoredCapture,
} from './capture';

const BOOK = bookId('book-one');

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(13), rect: imageRect(10, 20, 100, 40) },
];

const ANCHOR: Anchor = regionAnchor(REGIONS);

const QUOTED: Anchor = textAnchor('epubcfi(/6/14!/4/2/6,/1:0,/1:5)', {
  exact: 'こっちに来て',
  prefix: 'そして',
  suffix: 'と言った',
});

function draft(id: string, confidence: number | null = null): CaptureDraft {
  return {
    id: captureId(id),
    bookId: BOOK,
    anchor: ANCHOR,
    text: 'こっちに来て',
    confidence,
    origin: 'recognized',
  };
}

function note(id: string, text: string): Capture {
  return takenCapture(
    {
      id: captureId(id),
      bookId: BOOK,
      anchor: ANCHOR,
      text,
      origin: 'written',
    },
    1,
  );
}

function taken(id: string, createdAt: number): Capture {
  return takenCapture(draft(id), createdAt);
}

function lifted(id: string, text: string): Capture {
  return takenCapture(
    {
      id: captureId(id),
      bookId: BOOK,
      anchor: QUOTED,
      text,
      origin: 'lifted',
    },
    1,
  );
}

function asRecognized(capture: Capture): RecognizedCapture {
  if (capture.origin !== 'recognized') throw new Error('That capture was not recognized');
  return capture;
}

function asLifted(capture: Capture): LiftedCapture {
  if (capture.origin !== 'lifted') throw new Error('That capture was not lifted');
  return capture;
}

function asRegions(anchor: Anchor): readonly ImageRegion[] {
  if (anchor.kind !== 'region') throw new Error('That capture was not anchored to a region');
  return anchor.regions;
}

describe('takenCapture', () => {
  it('stamps the draft with the moment it was taken', () => {
    const capture = takenCapture(draft('a', 0.8), 1_700_000_000_000);

    expect(capture).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'こっちに来て',
      note: null,
      confidence: 0.8,
      origin: 'recognized',
      createdAt: 1_700_000_000_000,
      editedAt: null,
      tagIds: [],
    });
  });

  it('builds a written capture with no confidence and no note to carry', () => {
    const capture = note('a', 'my own words');

    expect(capture).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'my own words',
      origin: 'written',
      createdAt: 1,
      editedAt: null,
      tagIds: [],
    });
  });

  it('builds a lifted capture with no confidence and a note it can hold', () => {
    const capture = lifted('a', 'こっちに来て');

    expect(capture).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: QUOTED,
      text: 'こっちに来て',
      note: null,
      origin: 'lifted',
      createdAt: 1,
      editedAt: null,
      tagIds: [],
    });
  });

  it('keeps the image index and the rect rather than a page number', () => {
    const capture = takenCapture(draft('a'), 1);

    expect(capture.anchor.kind).toBe('region');
    expect(at(asRegions(capture.anchor), 0).index).toBe(13);
    expect(at(asRegions(capture.anchor), 0).rect).toEqual(imageRect(10, 20, 100, 40));
  });
});

describe('captureFromStored', () => {
  it('reads a record holding every field it knows, keeping each one', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored)).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'こっちに来て',
      note: null,
      confidence: 0.5,
      createdAt: 42,
      editedAt: null,
      origin: 'recognized',
      tagIds: [],
    });
  });

  it('anchors a record holding regions and no anchor to those regions', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored).anchor).toEqual(regionAnchor(REGIONS));
  });

  it('anchors a record holding neither an anchor nor regions nowhere', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      text: 'こっちに来て',
    };

    expect(captureFromStored(stored).anchor).toEqual(regionAnchor([]));
  });

  it('reads a stored text anchor back whole', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: QUOTED,
      text: 'こっちに来て',
      confidence: null,
      createdAt: 42,
    };

    expect(captureFromStored(stored).anchor).toEqual(QUOTED);
  });

  it('prefers the anchor a record carries over the regions beside it', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: QUOTED,
      regions: REGIONS,
      text: 'こっちに来て',
      createdAt: 42,
    };

    expect(captureFromStored(stored).anchor).toEqual(QUOTED);
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

    expect(asRecognized(captureFromStored(stored)).confidence).toBeNull();
  });

  it('reads a record written before a note was possible as carrying none', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(asRecognized(captureFromStored(stored)).note).toBeNull();
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

  it('reads a record written before notes existed as recognized', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored).origin).toBe('recognized');
  });

  it('reads a record written before tags existed as carrying no tag', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
    };

    expect(captureFromStored(stored).tagIds).toEqual([]);
  });

  it('keeps the tags a stored record carries', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
      tagIds: [tagId('grammar')],
    };

    expect(captureFromStored(stored).tagIds).toEqual(['grammar']);
  });

  it('keeps the origin a stored record carries', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'my own words',
      confidence: null,
      createdAt: 42,
      origin: 'written',
    };

    expect(captureFromStored(stored).origin).toBe('written');
  });

  it('reads a stored lifted record back as lifted, carrying its note', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: QUOTED,
      text: 'こっちに来て',
      createdAt: 42,
      origin: 'lifted',
      note: 'he means his sister',
    };

    expect(captureFromStored(stored)).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: QUOTED,
      text: 'こっちに来て',
      note: 'he means his sister',
      origin: 'lifted',
      createdAt: 42,
      editedAt: null,
      tagIds: [],
    });
  });

  it('drops a confidence a stored lifted record happens to carry', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: QUOTED,
      text: 'こっちに来て',
      confidence: 0.5,
      createdAt: 42,
      origin: 'lifted',
    };

    expect('confidence' in captureFromStored(stored)).toBe(false);
  });

  it('drops a confidence a stored written record happens to carry', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'my own words',
      confidence: 0.5,
      createdAt: 42,
      origin: 'written',
    };

    expect('confidence' in captureFromStored(stored)).toBe(false);
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

  it('keeps the lifted text when the edit is blank, because the book still holds it', () => {
    const edited = editedCapture(lifted('a', 'こっちに来て'), '   ', 77);

    expect(edited.text).toBe('こっちに来て');
    expect(edited.editedAt).toBe(77);
  });

  it('empties a written capture when the edit is blank', () => {
    const edited = editedCapture(note('a', 'my own words'), '   ', 77);

    expect(edited.text).toBe('');
    expect(edited.editedAt).toBe(77);
  });

  it('keeps everything the reader did not change', () => {
    const before = taken('a', 1);

    const edited = editedCapture(before, 'べつのことば', 77);

    expect(edited.id).toBe(before.id);
    expect(edited.bookId).toBe(before.bookId);
    expect(edited.anchor).toEqual(before.anchor);
    expect(edited.createdAt).toBe(before.createdAt);
  });
});

describe('notedCapture', () => {
  it('stores a note on a lifted capture and leaves it lifted', () => {
    const noted = notedCapture(asLifted(lifted('a', 'こっちに来て')), '  he means his sister  ');

    expect([noted.origin, noted.note]).toEqual(['lifted', 'he means his sister']);
  });

  it('stores the note the reader wrote, without the space around it', () => {
    const noted = notedCapture(asRecognized(taken('a', 1)), '  he means his sister  ');

    expect(noted.note).toBe('he means his sister');
  });

  it('stores no note for a blank one, which is how a reader takes a note back', () => {
    const written = notedCapture(asRecognized(taken('a', 1)), 'he means his sister');

    expect(notedCapture(written, '   \n  ').note).toBeNull();
  });

  it('leaves the recognized text and the moment it was edited where they were', () => {
    const before = asRecognized(editedCapture(taken('a', 1), 'べつのことば', 77));

    const noted = notedCapture(before, 'my own words');

    expect(noted.text).toBe('べつのことば');
    expect(noted.editedAt).toBe(77);
  });

  it('keeps everything else the capture carried', () => {
    const before = asRecognized(taken('a', 1));

    const noted = notedCapture(before, 'my own words');

    expect(noted.id).toBe(before.id);
    expect(noted.createdAt).toBe(before.createdAt);
    expect(noted.confidence).toBe(before.confidence);
    expect(noted.tagIds).toEqual(before.tagIds);
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
