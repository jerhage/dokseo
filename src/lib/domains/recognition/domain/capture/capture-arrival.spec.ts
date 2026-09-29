import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import {
  arrivalAt,
  firstRegion,
  matchesInBookOrder,
  passageArrivalAt,
  soughtPassage,
} from './capture-arrival';

type Row = {
  readonly origin: 'written';
  readonly id: CaptureId;
  readonly anchor: Anchor;
  readonly text: string;
};

function at(index: number, x: number, y: number): Anchor {
  return regionAnchor([{ index: imageIndex(index), rect: imageRect(x, y, 10, 10) }]);
}

function row(id: string, text: string, anchor: Anchor): Row {
  return { origin: 'written', id: captureId(id), anchor, text };
}

const FIRST = row('a', '海が見える', at(3, 100, 10));
const SECOND = row('b', '海まであと少し', at(3, 10, 10));
const THIRD = row('c', '海の匂い', at(9, 10, 10));
const OTHER = row('d', '山の上', at(1, 10, 10));

const ALL = [THIRD, OTHER, SECOND, FIRST];

describe('matchesInBookOrder', () => {
  it('keeps only the captures holding the query', () => {
    expect(matchesInBookOrder(ALL, '海', 'rtl').map((found) => found.id)).toEqual([
      FIRST.id,
      SECOND.id,
      THIRD.id,
    ]);
  });

  it('orders a right-to-left page from the right edge', () => {
    expect(matchesInBookOrder([SECOND, FIRST], '海', 'rtl')[0]?.id).toBe(FIRST.id);
  });

  it('orders a left-to-right page from the left edge', () => {
    expect(matchesInBookOrder([FIRST, SECOND], '海', 'ltr')[0]?.id).toBe(SECOND.id);
  });

  it('finds nothing for a query no capture holds', () => {
    expect(matchesInBookOrder(ALL, '空', 'rtl')).toEqual([]);
  });
});

describe('arrivalAt', () => {
  function position(capture: Row): ImageRegion {
    const region = firstRegion(capture.anchor);
    if (region === null) throw new Error('the fixture sits on no image');
    return region;
  }

  function near(index: number, x: number, y: number): ImageRegion {
    return { index: imageIndex(index), rect: imageRect(x, y, 10, 10) };
  }

  it('arrives at the one capture the position names when two sit on its image', () => {
    expect(arrivalAt(ALL, '海', 'rtl', position(SECOND))?.at.id).toBe(SECOND.id);
    expect(arrivalAt(ALL, null, 'rtl', position(SECOND))?.at.id).toBe(SECOND.id);
    expect(arrivalAt(ALL, null, 'rtl', position(FIRST))?.at.id).toBe(FIRST.id);
  });

  it('counts the arrival among the matching captures in book order', () => {
    const arrival = arrivalAt(ALL, '海', 'rtl', position(SECOND));
    expect(arrival?.stepping?.ordinal).toBe(2);
    expect(arrival?.stepping?.total).toBe(3);
  });

  it('names the neighbouring captures, one step per capture on the same image', () => {
    const arrival = arrivalAt(ALL, '海', 'rtl', position(SECOND));
    expect(arrival?.stepping?.previous.id).toBe(FIRST.id);
    expect(arrival?.stepping?.next.id).toBe(THIRD.id);
    expect(arrivalAt(ALL, '海', 'rtl', position(FIRST))?.stepping?.next.id).toBe(SECOND.id);
  });

  it('wraps from the last match back to the first', () => {
    expect(arrivalAt(ALL, '海', 'rtl', position(THIRD))?.stepping?.next.id).toBe(FIRST.id);
  });

  it('wraps from the first match back to the last', () => {
    expect(arrivalAt(ALL, '海', 'rtl', position(FIRST))?.stepping?.previous.id).toBe(THIRD.id);
  });

  it('stands on its own when it is the only match', () => {
    const only = arrivalAt([OTHER], '山', 'rtl', position(OTHER));
    expect(only?.stepping?.ordinal).toBe(1);
    expect(only?.stepping?.previous.id).toBe(OTHER.id);
    expect(only?.stepping?.next.id).toBe(OTHER.id);
  });

  it('reaches a capture named without a query and offers no stepping', () => {
    const arrival = arrivalAt(ALL, null, 'rtl', position(OTHER));
    expect(arrival?.at.id).toBe(OTHER.id);
    expect(arrival?.stepping).toBeNull();
  });

  it('treats a query of only spaces as no query at all', () => {
    expect(arrivalAt(ALL, '  ', 'rtl', position(SECOND))?.stepping).toBeNull();
  });

  it('reports nothing for a position where this book holds no capture', () => {
    expect(arrivalAt([FIRST, SECOND], null, 'rtl', position(THIRD))).toBeNull();
    expect(arrivalAt(ALL, '海', 'rtl', near(3, 50, 10))).toBeNull();
  });

  it('matches a position rounded to hundredths of a pixel back to the stored rect', () => {
    const exact = row('x', '海', at(4, 12.3456789, 98.7654321));

    expect(arrivalAt([exact], null, 'rtl', near(4, 12.35, 98.77))?.at.id).toBe(exact.id);
  });

  it('rejects a position more than a hundredth of a pixel from every stored rect', () => {
    const exact = row('x', '海', at(4, 12.3456789, 98.7654321));

    expect(arrivalAt([exact], null, 'rtl', near(4, 12.4, 98.77))).toBeNull();
  });

  it('picks the nearer of two captures within the tolerance', () => {
    const left = row('l', '海', at(4, 20, 20));
    const right = row('r', '海', at(4, 20.004, 20));

    expect(arrivalAt([left, right], null, 'rtl', near(4, 20.004, 20))?.at.id).toBe(right.id);
  });

  it('names a capture by the image its first region sits on', () => {
    const spread = row(
      's',
      '海',
      regionAnchor([
        { index: imageIndex(6), rect: imageRect(0, 0, 10, 10) },
        { index: imageIndex(7), rect: imageRect(0, 0, 10, 10) },
      ]),
    );

    expect(arrivalAt([spread], '海', 'rtl', near(6, 0, 0))?.at.id).toBe(spread.id);
    expect(arrivalAt([spread], '海', 'rtl', near(7, 0, 0))).toBeNull();
  });
});

describe('arrivalAt for a capture the query never matched', () => {
  const wanted = row('tagged', 'この坂を上れば', at(0, 10, 10));
  const other = row('other', '海が見える', at(1, 10, 10));
  const place = { index: imageIndex(0), rect: imageRect(10, 10, 10, 10) };

  it('arrives at a capture whose text holds none of the query, so the box is drawn', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', place)?.at.id).toBe(wanted.id);
  });

  it('offers no stepping there, because it is not one of the query matches', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', place)?.stepping).toBeNull();
  });
});

describe('soughtPassage', () => {
  const CFI = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';
  const QUOTE = { exact: '灯台', prefix: 'あの', suffix: 'へ' };

  it('seeks the cfi with the quote of a passage lifted at exactly that cfi', () => {
    expect(soughtPassage([at(0, 0, 0), textAnchor(CFI, QUOTE, null)], CFI)).toEqual({
      cfi: CFI,
      quote: QUOTE,
    });
  });

  it('seeks the cfi alone when no capture was lifted there', () => {
    expect(soughtPassage([textAnchor('epubcfi(/6/2)', QUOTE, null)], CFI)).toEqual({
      cfi: CFI,
      quote: null,
    });
  });
});

describe('passageArrivalAt', () => {
  const READING_ORDER = ['cfi-1', 'cfi-2', 'cfi-3', 'cfi-4'];

  function byReadingOrder(earlier: string, later: string): number {
    return READING_ORDER.indexOf(earlier) - READING_ORDER.indexOf(later);
  }

  function passage(cfi: string, exact: string): Anchor {
    return textAnchor(cfi, { exact, prefix: '', suffix: '' }, null);
  }

  const OPENING = row('p1', '海が見える', passage('cfi-1', '海が見える'));
  const MOUNTAIN = row('p2', '山の上', passage('cfi-2', '山の上'));
  const MIDDLE = row('p3', '海まであと少し', passage('cfi-3', '海まであと少し'));
  const CLOSING = row('p4', '海の匂い', passage('cfi-4', '海の匂い'));
  const UNPLACED = row('p5', '海のない場所', passage('', '海のない場所'));
  const ON_A_PAGE = row('r1', '海の絵', at(2, 10, 10));

  const LIFTED = [CLOSING, UNPLACED, MOUNTAIN, MIDDLE, ON_A_PAGE, OPENING];

  it('counts the passage among the matching passages in book order', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-3', byReadingOrder);

    expect(arrival?.at.id).toBe(MIDDLE.id);
    expect([arrival?.stepping?.ordinal, arrival?.stepping?.total]).toEqual([2, 3]);
  });

  it('names the passages before and after it in book order', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-3', byReadingOrder);

    expect([arrival?.stepping?.previous.id, arrival?.stepping?.next.id]).toEqual([
      OPENING.id,
      CLOSING.id,
    ]);
  });

  it('wraps from the last passage back to the first', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-4', byReadingOrder);

    expect(arrival?.stepping?.next.id).toBe(OPENING.id);
  });

  it('wraps from the first passage back to the last', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-1', byReadingOrder);

    expect(arrival?.stepping?.previous.id).toBe(CLOSING.id);
  });

  it('steps over a capture on a page and a capture that names no passage', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-1', byReadingOrder);

    expect(arrival?.stepping?.total).toBe(3);
  });

  it('offers no stepping for a passage reached without a query', () => {
    const arrival = passageArrivalAt(LIFTED, null, 'cfi-2', byReadingOrder);

    expect(arrival).toEqual({ at: MOUNTAIN, stepping: null });
  });

  it('offers no stepping for a passage the query does not match', () => {
    const arrival = passageArrivalAt(LIFTED, '海', 'cfi-2', byReadingOrder);

    expect(arrival).toEqual({ at: MOUNTAIN, stepping: null });
  });

  it('reports nothing for a cfi no capture was lifted at', () => {
    expect(passageArrivalAt(LIFTED, '海', 'cfi-9', byReadingOrder)).toBeNull();
  });
});
