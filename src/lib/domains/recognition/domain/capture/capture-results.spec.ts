import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, TagId } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { at } from '$lib/shared/testing/at';
import { captureHolds, matchesByBook, matchTally, taggedByBook } from './capture-results';
import type { SearchedBook, SearchedCapture } from './capture-results';

type Found = {
  readonly name: string;
  readonly origin: 'recognized';
  readonly bookId: BookId;
  readonly anchor: Anchor;
  readonly text: string;
  readonly note: string | null;
};

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

function book(id: string, direction: ReadingDirection = 'rtl'): SearchedBook {
  return { id: bookId(id), title: `Book ${id}`, language: 'ja', direction };
}

function capture(name: string, id: string, text: string, index = 0, x = 0, y = 0): Found {
  return {
    name,
    origin: 'recognized',
    bookId: bookId(id),
    anchor: regionAnchor([{ index: imageIndex(index), rect: pageRect(x, y, 100, 60) }]),
    text,
    note: null,
  };
}

function noted(text: string, note: string | null): SearchedCapture {
  return { origin: 'recognized', text, note };
}

function written(text: string): SearchedCapture {
  return { origin: 'written', text };
}

function liftedFrom(text: string, note: string | null): SearchedCapture {
  return { origin: 'lifted', text, note };
}

type Lifted = Omit<Found, 'origin'> & { readonly origin: 'lifted' };

function liftedCapture(name: string, id: string, text: string, note: string | null): Lifted {
  return {
    name,
    origin: 'lifted',
    bookId: bookId(id),
    anchor: textAnchor(
      `epubcfi(/6/14!/4/2/${name}:0)`,
      { exact: text, prefix: '', suffix: '' },
      null,
    ),
    text,
    note,
  };
}

const PASSAGE_ORDER = ['opening', 'middle', 'closing'].map(
  (name) => `epubcfi(/6/14!/4/2/${name}:0)`,
);

function byPassageOrder(earlier: string, later: string): number {
  return PASSAGE_ORDER.indexOf(earlier) - PASSAGE_ORDER.indexOf(later);
}

function names(
  matched: readonly { readonly captures: readonly { readonly name: string }[] }[],
): readonly string[][] {
  return matched.map((one) => one.captures.map((found) => found.name));
}

const SFX: TagId = tagId('sfx');

const KEIGO: TagId = tagId('keigo');

type Held = Found & { readonly tagIds: readonly TagId[] };

function held(name: string, id: string, tags: readonly TagId[], index = 0, x = 0, y = 0): Held {
  return { ...capture(name, id, 'text', index, x, y), tagIds: tags };
}

function heldNames(tagged: readonly { readonly captures: readonly Held[] }[]): readonly string[][] {
  return tagged.map((one) => one.captures.map((found) => found.name));
}

describe('captureHolds', () => {
  it.each([
    [
      'a recognized capture whose text holds the query',
      capture('only', 'one', '海が見える'),
      '海',
      true,
    ],
    [
      'a recognized capture whose text does not hold the query',
      capture('only', 'one', '海が見える'),
      'ラーメン',
      false,
    ],
    ['a written capture whose text holds the query', written('海が見える'), '海', true],
    ['a written capture whose text does not hold the query', written('山の上'), '海', false],
    ['a lifted capture whose text holds the query', liftedFrom('海が見える', null), '海', true],
    [
      'a lifted capture whose text does not hold the query',
      liftedFrom('山の上', null),
      '海',
      false,
    ],
  ] as const)('matches by its text %s', (_, searched, query, holds) => {
    expect(captureHolds(searched, query)).toBe(holds);
  });

  it('matches through the fold, by case and by character width', () => {
    expect(captureHolds(capture('cased', 'one', 'Coffee'), 'coffee')).toBe(true);
    expect(captureHolds(capture('narrow', 'one', 'ｺｰﾋｰ'), 'コーヒー')).toBe(true);
  });

  it.each([
    ['a blank query', capture('only', 'one', '海が見える'), ''],
    ['a query that is only spaces', capture('only', 'one', '海が見える'), '   '],
    ['a query of spaces on a noted capture', noted('海が見える', '海の音'), '   '],
    ['a blank query on a written capture', written('海が見える'), ''],
  ] as const)('rejects %s', (_, searched, query) => {
    expect(captureHolds(searched, query)).toBe(false);
  });

  it.each([
    [
      'a recognized capture by its note when its text does not hold the query',
      noted('山の上', '海の音'),
      true,
    ],
    [
      'no recognized capture whose null note is the only place the query could sit',
      noted('山の上', null),
      false,
    ],
    [
      'a lifted capture by its note when its text does not hold the query',
      liftedFrom('山の上', '海の音'),
      true,
    ],
    [
      'no lifted capture whose null note is the only place the query could sit',
      liftedFrom('山の上', null),
      false,
    ],
  ] as const)('matches %s', (_, searched, holds) => {
    expect(captureHolds(searched, '海')).toBe(holds);
  });

  it('matches a note through the fold, by case and by character width', () => {
    expect(captureHolds(noted('山の上', 'Coffee'), 'coffee')).toBe(true);
    expect(captureHolds(noted('山の上', 'ｺｰﾋｰ'), 'コーヒー')).toBe(true);
  });
});

describe('matchesByBook', () => {
  it('groups the captures that match under the book each was taken from', () => {
    const matched = matchesByBook(
      [
        capture('first', 'one', '海が見える'),
        capture('second', 'two', '海の音'),
        capture('third', 'one', '海へ行く', 1),
      ],
      [book('one'), book('two')],
      '海',
      byCfi,
    );

    expect(matched.map((one) => one.book.id)).toEqual([bookId('one'), bookId('two')]);
    expect(names(matched)).toEqual([['first', 'third'], ['second']]);
  });

  it('keeps the books in the order they were given', () => {
    const matched = matchesByBook(
      [capture('later', 'two', '海'), capture('earlier', 'one', '海')],
      [book('two'), book('one')],
      '海',
      byCfi,
    );

    expect(matched.map((one) => one.book.id)).toEqual([bookId('two'), bookId('one')]);
  });

  it('orders the captures inside each book the way that book reads', () => {
    const matched = matchesByBook(
      [
        capture('left', 'one', '海', 0, 20, 100),
        capture('right', 'one', '海', 0, 600, 100),
        capture('top', 'two', '海', 0, 600, 100),
        capture('bottom', 'two', '海', 0, 20, 900),
      ],
      [book('one', 'rtl'), book('two', 'ltr')],
      '海',
      byCfi,
    );

    expect(names(matched)).toEqual([
      ['right', 'left'],
      ['top', 'bottom'],
    ]);
  });

  it('reports nothing when no capture holds the text', () => {
    const matched = matchesByBook(
      [capture('only', 'one', '海が見える')],
      [book('one')],
      'ラーメン',
      byCfi,
    );

    expect(matched).toEqual([]);
    expect(matchTally(matched)).toBe(0);
  });

  it('drops a match whose book has since been deleted', () => {
    const matched = matchesByBook(
      [capture('living', 'one', '海'), capture('orphan', 'gone', '海')],
      [book('one')],
      '海',
      byCfi,
    );

    expect(names(matched)).toEqual([['living']]);
    expect(matchTally(matched)).toBe(1);
    expect(matchesByBook([capture('orphan', 'gone', '海')], [book('one')], '海', byCfi)).toEqual(
      [],
    );
  });

  it('leaves out a book holding no match', () => {
    const matched = matchesByBook(
      [capture('only', 'one', '海')],
      [book('one'), book('two')],
      '海',
      byCfi,
    );

    expect(matched).toHaveLength(1);
    expect(at(matched, 0).book.id).toBe(bookId('one'));
  });

  it('counts every match across every book', () => {
    const matched = matchesByBook(
      [capture('a', 'one', '海'), capture('b', 'one', '海'), capture('c', 'two', '海')],
      [book('one'), book('two')],
      '海',
      byCfi,
    );

    expect(matchTally(matched)).toBe(3);
  });

  const ONCE: readonly {
    readonly how: string;
    readonly captures: readonly (Found | Lifted)[];
    readonly expected: readonly string[][];
    readonly tally: number;
  }[] = [
    {
      how: 'in its text twice and in its note',
      captures: [{ ...capture('many', 'one', '海から海へ'), note: '海の音' }],
      expected: [['many']],
      tally: 1,
    },
    {
      how: 'in its text and in its note, beside one holding it in its note alone',
      captures: [
        { ...capture('both', 'one', '海から海へ'), note: '海の音' },
        { ...capture('noted', 'one', '山の上', 1), note: '海の匂い' },
      ],
      expected: [['both', 'noted']],
      tally: 2,
    },
    {
      how: 'as a lifted capture, in its text and in its note',
      captures: [liftedCapture('passage', 'one', '海から海へ', '海の音')],
      expected: [['passage']],
      tally: 1,
    },
  ];

  for (const { how, captures, expected, tally } of ONCE) {
    it(`counts a capture once however many ways it holds the query: ${how}`, () => {
      const matched = matchesByBook(captures, [book('one')], '海', byCfi);

      expect(names(matched)).toEqual(expected);
      expect(matchTally(matched)).toBe(tally);
    });
  }

  it('orders the lifted captures inside a book by the passage order it is given', () => {
    const matched = matchesByBook(
      [
        liftedCapture('closing', 'one', '海の匂い', null),
        liftedCapture('opening', 'one', '海が見える', null),
        liftedCapture('middle', 'one', '海まであと少し', null),
      ],
      [book('one')],
      '海',
      byPassageOrder,
    );

    expect(names(matched)).toEqual([['opening', 'middle', 'closing']]);
  });
});

describe('taggedByBook', () => {
  it('orders the lifted captures inside a book by the passage order it is given', () => {
    const tagged = taggedByBook(
      [
        { ...liftedCapture('middle', 'one', '海まであと少し', null), tagIds: [SFX] },
        { ...liftedCapture('closing', 'one', '海の匂い', null), tagIds: [SFX] },
        { ...liftedCapture('opening', 'one', '海が見える', null), tagIds: [SFX] },
      ],
      [book('one')],
      SFX,
      byPassageOrder,
    );

    expect(names(tagged)).toEqual([['opening', 'middle', 'closing']]);
  });

  it('groups the captures carrying the tag under the book each was taken from', () => {
    const tagged = taggedByBook(
      [
        held('first', 'one', [SFX]),
        held('second', 'two', [SFX]),
        held('third', 'one', [SFX], 1),
        held('other', 'one', [KEIGO], 2),
      ],
      [book('one'), book('two')],
      SFX,
      byCfi,
    );

    expect(tagged.map((one) => one.book.id)).toEqual([bookId('one'), bookId('two')]);
    expect(heldNames(tagged)).toEqual([['first', 'third'], ['second']]);
  });

  it('reports nothing for a tag no capture carries', () => {
    expect(taggedByBook([held('only', 'one', [SFX])], [book('one')], KEIGO, byCfi)).toEqual([]);
  });
});
