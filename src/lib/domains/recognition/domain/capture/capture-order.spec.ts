import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { inBookOrder, inPassageOrder } from './capture-order';

type Placed = { readonly name: string; readonly anchor: Anchor };

function at(name: string, index: number, x: number, y: number, width = 100, height = 60): Placed {
  return {
    name,
    anchor: regionAnchor([{ index: imageIndex(index), rect: pageRect(x, y, width, height) }]),
  };
}

function quoted(name: string, exact: string): Placed {
  return {
    name,
    anchor: textAnchor(cfiOf(name), { exact, prefix: '', suffix: '' }, null),
  };
}

const LISTED_ORDER = ['first', 'second', 'third'].map(cfiOf);

function cfiOf(name: string): string {
  return `epubcfi(/6/14!/4/2/${name})`;
}

function byListedOrder(earlier: string, later: string): number {
  return LISTED_ORDER.indexOf(earlier) - LISTED_ORDER.indexOf(later);
}

function byCfi(earlier: string, later: string): number {
  return earlier.localeCompare(later);
}

function names(placed: readonly Placed[]): readonly string[] {
  return placed.map((one) => one.name);
}

describe('inBookOrder', () => {
  it.each(['ltr', 'rtl'] as const)(
    'orders across pages by image index, reading %s',
    (direction) => {
      const ordered = inBookOrder([at('later', 7, 0, 0), at('earlier', 3, 0, 0)], direction, byCfi);

      expect(names(ordered)).toEqual(['earlier', 'later']);
    },
  );

  for (const { name, direction, given, expected } of [
    {
      name: 'right-to-left page from the right edge inward',
      direction: 'rtl',
      given: [at('left', 1, 20, 500), at('right', 1, 600, 900)],
      expected: ['right', 'left'],
    },
    {
      name: 'left-to-right page from the top down',
      direction: 'ltr',
      given: [at('low', 1, 600, 900), at('high', 1, 20, 500)],
      expected: ['high', 'low'],
    },
    {
      name: 'right-to-left column from the top down',
      direction: 'rtl',
      given: [at('low', 1, 600, 900), at('high', 1, 600, 100)],
      expected: ['high', 'low'],
    },
    {
      name: 'left-to-right row from the left',
      direction: 'ltr',
      given: [at('right', 1, 600, 100), at('left', 1, 20, 100)],
      expected: ['left', 'right'],
    },
  ] as const) {
    it(`orders a ${name}`, () => {
      expect(names(inBookOrder(given, direction, byCfi))).toEqual(expected);
    });
  }

  it('reads a wider right-to-left region from its right edge, not its left', () => {
    const ordered = inBookOrder(
      [at('narrow', 1, 400, 0, 100), at('wide', 1, 100, 0, 420)],
      'rtl',
      byCfi,
    );

    expect(names(ordered)).toEqual(['wide', 'narrow']);
  });

  it('uses only the first region of a capture that spans a seam', () => {
    const spanning: Placed = {
      name: 'spanning',
      anchor: regionAnchor([
        { index: imageIndex(4), rect: pageRect(0, 0.9, 0.1, 0.06) },
        { index: imageIndex(5), rect: pageRect(0, 0, 0.1, 0.06) },
      ]),
    };
    const ordered = inBookOrder([at('single', 5, 0, 0), spanning], 'ltr', byCfi);

    expect(names(ordered)).toEqual(['spanning', 'single']);
  });

  it('sorts a capture holding no regions last', () => {
    const nowhere: Placed = { name: 'nowhere', anchor: regionAnchor([]) };
    const ordered = inBookOrder([nowhere, at('placed', 9, 0, 0)], 'ltr', byCfi);

    expect(names(ordered)).toEqual(['placed', 'nowhere']);
  });

  it('keeps two captures holding no regions in the order they arrived', () => {
    const first: Placed = { name: 'first', anchor: regionAnchor([]) };
    const second: Placed = { name: 'second', anchor: regionAnchor([]) };
    const ordered = inBookOrder([first, second], 'ltr', byCfi);

    expect(names(ordered)).toEqual(['first', 'second']);
  });

  for (const { direction, given } of [
    {
      direction: 'ltr',
      given: [quoted('third', '海'), quoted('first', '山'), quoted('second', '空')],
    },
    {
      direction: 'rtl',
      given: [quoted('second', '空'), quoted('third', '海'), quoted('first', '山')],
    },
  ] as const) {
    it(`orders text anchors by the passage order it is given for their cfis, reading ${direction}`, () => {
      expect(names(inBookOrder(given, direction, byListedOrder))).toEqual([
        'first',
        'second',
        'third',
      ]);
    });
  }

  it('sorts a text anchor with no cfi after every placed passage, and never asks the order about it', () => {
    const asked: string[] = [];
    const nowhere: Placed = {
      name: 'nowhere',
      anchor: textAnchor('', { exact: '', prefix: '', suffix: '' }, null),
    };
    const ordered = inBookOrder(
      [nowhere, quoted('second', '空'), quoted('first', '山')],
      'ltr',
      (earlier, later) => {
        asked.push(earlier, later);
        return byListedOrder(earlier, later);
      },
    );

    expect(names(ordered)).toEqual(['first', 'second', 'nowhere']);
    expect(asked).not.toContain('');
  });

  it('orders region anchors before text anchors, whichever it meets first', () => {
    const given = [quoted('second', '空'), at('page', 3, 0, 0), quoted('first', '山')];

    expect(names(inBookOrder(given, 'rtl', byListedOrder))).toEqual(['page', 'first', 'second']);
    expect(names(inBookOrder(given.toReversed(), 'rtl', byListedOrder))).toEqual([
      'page',
      'first',
      'second',
    ]);
  });

  it('asks the passage order nothing about region anchors', () => {
    let asked = 0;
    inBookOrder([at('later', 7, 0, 0), at('earlier', 3, 0, 0)], 'ltr', () => {
      asked += 1;
      return 0;
    });

    expect(asked).toBe(0);
  });

  it('leaves the captures it was given untouched', () => {
    const given = [at('later', 7, 0, 0), at('earlier', 3, 0, 0)];
    inBookOrder(given, 'ltr', byCfi);

    expect(names(given)).toEqual(['later', 'earlier']);
  });
});

describe('inPassageOrder', () => {
  type Lifted = { readonly name: string; readonly anchor: TextAnchor };

  function lifted(name: string, cfi: string): Lifted {
    return {
      name,
      anchor: { kind: 'text', cfi, quote: { exact: name, prefix: '', suffix: '' }, chapter: null },
    };
  }

  const READING_ORDER = ['c1', 'c2', 'c3'];

  function byReadingOrder(earlier: string, later: string): number {
    return READING_ORDER.indexOf(earlier) - READING_ORDER.indexOf(later);
  }

  it('orders passages by the order it is given for their cfis', () => {
    const ordered = inPassageOrder(
      [lifted('third', 'c3'), lifted('first', 'c1'), lifted('second', 'c2')],
      byReadingOrder,
    );

    expect(names(ordered)).toEqual(['first', 'second', 'third']);
  });

  it('leaves the passages it was given untouched', () => {
    const given = [lifted('later', 'c2'), lifted('earlier', 'c1')];
    inPassageOrder(given, byReadingOrder);

    expect(names(given)).toEqual(['later', 'earlier']);
  });
});
