import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
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

const QUOTE: TextQuote = { exact: 'こっちに来て', prefix: 'そして', suffix: 'と言った' };

const QUOTED: Anchor = textAnchor('epubcfi(/6/14!/4/2/6,/1:0,/1:5)', QUOTE, null);

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

describe('takenCapture', () => {
  for (const { name, capture, expected } of [
    {
      name: 'stamps the draft with the moment it was taken',
      capture: takenCapture(draft('a', 0.8), 1_700_000_000_000),
      expected: {
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
      },
    },
    {
      name: 'builds a written capture with no confidence and no note to carry',
      capture: note('a', 'my own words'),
      expected: {
        id: 'a',
        bookId: BOOK,
        anchor: ANCHOR,
        text: 'my own words',
        origin: 'written',
        createdAt: 1,
        editedAt: null,
        tagIds: [],
      },
    },
    {
      name: 'builds a lifted capture with no confidence and a note it can hold',
      capture: lifted('a', 'こっちに来て'),
      expected: {
        id: 'a',
        bookId: BOOK,
        anchor: QUOTED,
        text: 'こっちに来て',
        note: null,
        origin: 'lifted',
        createdAt: 1,
        editedAt: null,
        tagIds: [],
      },
    },
  ]) {
    it(name, () => {
      expect(capture).toEqual(expected);
    });
  }
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

  it('reads back the chapter a stored text anchor names', () => {
    const named = textAnchor('epubcfi(/6/14!/4/2/6,/1:0,/1:5)', QUOTE, '第一章');
    const stored: StoredCapture = { id: captureId('a'), bookId: BOOK, anchor: named, text: '海' };

    expect(captureFromStored(stored).anchor).toEqual(named);
  });

  it('reads a text anchor stored before chapters were kept as naming no chapter', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)', quote: QUOTE },
      text: 'こっちに来て',
      createdAt: 42,
    };

    expect(captureFromStored(stored).anchor).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)',
      quote: QUOTE,
      chapter: null,
    });
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

  it('reads a stored origin it does not know as recognized', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      regions: REGIONS,
      text: 'こっちに来て',
      origin: 'dictated',
    };

    expect(captureFromStored(stored).origin).toBe('recognized');
  });

  it('throws a corrupt row for a stored anchor kind it does not know', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: { ...QUOTED, kind: 'page' } as unknown as Anchor,
      text: 'こっちに来て',
    };

    expect(() => captureFromStored(stored)).toThrow(CorruptRow);
    expect(() => captureFromStored(stored)).toThrow(
      'A stored capture holds an unknown anchor kind: page',
    );
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

  for (const { origin, stored } of [
    {
      origin: 'lifted',
      stored: {
        id: captureId('a'),
        bookId: BOOK,
        anchor: QUOTED,
        text: 'こっちに来て',
        confidence: 0.5,
        createdAt: 42,
        origin: 'lifted',
      },
    },
    {
      origin: 'written',
      stored: {
        id: captureId('a'),
        bookId: BOOK,
        regions: REGIONS,
        text: 'my own words',
        confidence: 0.5,
        createdAt: 42,
        origin: 'written',
      },
    },
  ]) {
    it(`drops a confidence a stored ${origin} record happens to carry`, () => {
      expect('confidence' in captureFromStored(stored)).toBe(false);
    });
  }

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

  for (const { name, before, text } of [
    {
      name: 'keeps the previous text when the edit is blank',
      before: taken('a', 1),
      text: 'こっちに来て',
    },
    {
      name: 'keeps the lifted text when the edit is blank, because the book still holds it',
      before: lifted('a', 'こっちに来て'),
      text: 'こっちに来て',
    },
    {
      name: 'empties a written capture when the edit is blank',
      before: note('a', 'my own words'),
      text: '',
    },
  ]) {
    it(name, () => {
      const edited = editedCapture(before, '   ', 77);

      expect(edited.text).toBe(text);
      expect(edited.editedAt).toBe(77);
    });
  }

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
  for (const { name, before, origin } of [
    {
      name: 'stores a note on a lifted capture and leaves it lifted',
      before: asLifted(lifted('a', 'こっちに来て')),
      origin: 'lifted',
    },
    {
      name: 'stores the note the reader wrote, without the space around it',
      before: asRecognized(taken('a', 1)),
      origin: 'recognized',
    },
  ]) {
    it(name, () => {
      const noted = notedCapture(before, '  he means his sister  ');

      expect([noted.origin, noted.note]).toEqual([origin, 'he means his sister']);
    });
  }

  it('stores no note for a blank one, which is how a reader takes a note back', () => {
    const written = notedCapture(asRecognized(taken('a', 1)), 'he means his sister');

    expect(notedCapture(written, '   \n  ').note).toBeNull();
  });

  it('leaves the recognized text and the moment it was edited where they were, with everything else the capture carried', () => {
    const before = asRecognized(editedCapture(taken('a', 1), 'べつのことば', 77));

    const noted = notedCapture(before, 'my own words');

    expect(noted.text).toBe('べつのことば');
    expect(noted.editedAt).toBe(77);
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
