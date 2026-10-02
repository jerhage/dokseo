import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { CorruptRow } from '$lib/shared/corrupt-row';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import {
  captureFromStored,
  capturesFromStored,
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
      anchor: ANCHOR,
      text: 'こっちに来て',
      note: 'he means his sister',
      confidence: 0.5,
      createdAt: 42,
      editedAt: 99,
      origin: 'recognized',
      tagIds: [tagId('grammar')],
    };

    expect(captureFromStored(stored)).toEqual({
      id: 'a',
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'こっちに来て',
      note: 'he means his sister',
      confidence: 0.5,
      createdAt: 42,
      editedAt: 99,
      origin: 'recognized',
      tagIds: ['grammar'],
    });
  });

  it('reads back the chapter a stored text anchor names', () => {
    const named = textAnchor('epubcfi(/6/14!/4/2/6,/1:0,/1:5)', QUOTE, '第一章');
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: named,
      text: '海',
      createdAt: 42,
      editedAt: null,
      origin: 'written',
      tagIds: [],
    };

    expect(captureFromStored(stored).anchor).toEqual(named);
  });

  it('keeps the origin a stored record carries', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'my own words',
      createdAt: 42,
      editedAt: null,
      origin: 'written',
      tagIds: [],
    };

    expect(captureFromStored(stored).origin).toBe('written');
  });

  it('reads a stored origin it does not know as recognized, carrying no note and no confidence', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: ANCHOR,
      text: 'こっちに来て',
      createdAt: 42,
      editedAt: null,
      origin: 'dictated',
      tagIds: [],
    };

    const read = asRecognized(captureFromStored(stored));

    expect([read.origin, read.note, read.confidence]).toEqual(['recognized', null, null]);
  });

  it('throws a corrupt row for a stored anchor kind it does not know', () => {
    const stored: StoredCapture = {
      id: captureId('a'),
      bookId: BOOK,
      anchor: { ...QUOTED, kind: 'page' } as unknown as Anchor,
      text: 'こっちに来て',
      createdAt: 42,
      editedAt: null,
      origin: 'recognized',
      tagIds: [],
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
      editedAt: null,
      origin: 'lifted',
      note: 'he means his sister',
      tagIds: [],
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
        editedAt: null,
        origin: 'lifted',
        tagIds: [],
      },
    },
    {
      origin: 'written',
      stored: {
        id: captureId('a'),
        bookId: BOOK,
        anchor: ANCHOR,
        text: 'my own words',
        confidence: 0.5,
        createdAt: 42,
        editedAt: null,
        origin: 'written',
        tagIds: [],
      },
    },
  ]) {
    it(`drops a confidence a stored ${origin} record happens to carry`, () => {
      expect('confidence' in captureFromStored(stored)).toBe(false);
    });
  }
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

describe('capturesFromStored', () => {
  const kept = {
    id: captureId('kept'),
    bookId: BOOK,
    anchor: ANCHOR,
    text: 'こっちに来て',
    createdAt: 1,
    editedAt: null,
    origin: 'written',
    tagIds: [],
  } satisfies StoredCapture;

  it('reports a row whose mapping throws as unreadable by its id and keeps the rows that read', () => {
    const anchorless = { ...kept, id: 'old', anchor: undefined } as unknown as StoredCapture;
    const read = capturesFromStored([kept, anchorless]);

    expect(read.captures.map((capture) => capture.id)).toEqual(['kept']);
    expect(read.unreadable).toEqual([{ id: 'old' }]);
  });

  const complete = {
    id: captureId('full'),
    bookId: BOOK,
    anchor: ANCHOR,
    text: 'こっちに来て',
    note: null,
    confidence: 0.5,
    createdAt: 1,
    editedAt: null,
    origin: 'recognized',
    tagIds: [tagId('grammar')],
  } satisfies StoredCapture;

  function without(field: string): StoredCapture {
    return Object.fromEntries(Object.entries(complete).filter(([key]) => key !== field));
  }

  it.each(['bookId', 'anchor', 'text', 'createdAt', 'editedAt', 'tagIds'])(
    'reports a row without its %s as unreadable',
    (field) => {
      const read = capturesFromStored([without(field)]);

      expect(read.captures).toEqual([]);
      expect(read.unreadable).toEqual([{ id: 'full' }]);
    },
  );

  it.each([
    ['bookId', 7],
    ['text', null],
    ['createdAt', '1'],
    ['editedAt', '99'],
    ['tagIds', 'grammar'],
    ['tagIds', [7]],
    ['note', 7],
    ['confidence', 'high'],
    ['anchor', 'region'],
    ['anchor', { kind: 'region' }],
    ['anchor', { kind: 'region', regions: [{ index: 13 }] }],
    ['anchor', { kind: 'region', regions: [{ index: 13, rect: { x: 1, y: 2, width: 3 } }] }],
    ['anchor', { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)', quote: QUOTE }],
    ['anchor', { kind: 'text', cfi: 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)', chapter: null }],
    ['anchor', { kind: 'text', quote: QUOTE, chapter: null }],
    [
      'anchor',
      {
        kind: 'text',
        cfi: 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)',
        quote: { exact: '海' },
        chapter: null,
      },
    ],
  ])('reports a row whose %s holds %j as unreadable', (field, value) => {
    const read = capturesFromStored([{ ...complete, [field]: value }]);

    expect(read.captures).toEqual([]);
    expect(read.unreadable).toEqual([{ id: 'full' }]);
  });

  it.each(['note', 'confidence', 'origin'])(
    'reads a row without its %s through the fallback',
    (field) => {
      expect(capturesFromStored([without(field)]).captures.map((capture) => capture.id)).toEqual([
        'full',
      ]);
    },
  );

  it('reads a complete current row back as it was written', () => {
    expect(capturesFromStored([complete, { ...complete, id: 'text', anchor: QUOTED }])).toEqual({
      captures: [
        { ...complete, tagIds: ['grammar'] },
        { ...complete, id: 'text', anchor: QUOTED, tagIds: ['grammar'] },
      ],
      unreadable: [],
    });
  });

  it('names the field a stored capture lacks', () => {
    expect(() => captureFromStored(without('tagIds'))).toThrow(
      'A stored capture lacks its tag ids',
    );
  });

  it('rethrows the mapping failure of a row without an id', () => {
    const nameless = { ...kept, id: 7, anchor: { kind: 'page' } } as unknown as StoredCapture;

    expect(() => capturesFromStored([nameless])).toThrow(CorruptRow);
  });
});
