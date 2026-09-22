import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { arrivalAt, matchesInBookOrder } from './capture-arrival';

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
  it('counts the arrival among the matches in book order', () => {
    const arrival = arrivalAt(ALL, '海', 'rtl', SECOND.id);
    expect(arrival?.stepping?.ordinal).toBe(2);
    expect(arrival?.stepping?.total).toBe(3);
  });

  it('names the neighbouring matches', () => {
    const arrival = arrivalAt(ALL, '海', 'rtl', SECOND.id);
    expect(arrival?.stepping?.previous.id).toBe(FIRST.id);
    expect(arrival?.stepping?.next.id).toBe(THIRD.id);
  });

  it('wraps from the last match back to the first', () => {
    expect(arrivalAt(ALL, '海', 'rtl', THIRD.id)?.stepping?.next.id).toBe(FIRST.id);
  });

  it('wraps from the first match back to the last', () => {
    expect(arrivalAt(ALL, '海', 'rtl', FIRST.id)?.stepping?.previous.id).toBe(THIRD.id);
  });

  it('stands on its own when it is the only match', () => {
    const only = arrivalAt([OTHER], '山', 'rtl', OTHER.id);
    expect(only?.stepping?.ordinal).toBe(1);
    expect(only?.stepping?.previous.id).toBe(OTHER.id);
    expect(only?.stepping?.next.id).toBe(OTHER.id);
  });

  it('reaches a capture named without a query and offers no stepping', () => {
    const arrival = arrivalAt(ALL, null, 'rtl', OTHER.id);
    expect(arrival?.at.id).toBe(OTHER.id);
    expect(arrival?.stepping).toBeNull();
  });

  it('treats a query of only spaces as no query at all', () => {
    expect(arrivalAt(ALL, '  ', 'rtl', SECOND.id)?.stepping).toBeNull();
  });

  it('reports nothing for a capture this book does not hold', () => {
    expect(arrivalAt([FIRST, SECOND], null, 'rtl', THIRD.id)).toBeNull();
  });

  it('reports nothing for an unknown capture named without a query', () => {
    expect(arrivalAt(ALL, null, 'rtl', captureId('missing'))).toBeNull();
  });

  it('arrives at the named capture even when the query never matched it', () => {
    expect(arrivalAt(ALL, '海', 'rtl', OTHER.id)?.at.id).toBe(OTHER.id);
  });

  it('reports nothing when the named capture is gone', () => {
    expect(arrivalAt(ALL, '海', 'rtl', captureId('missing'))).toBeNull();
  });
});

describe('arrivalAt for a capture the query never matched', () => {
  const wanted = row('tagged', 'この坂を上れば', at(0, 10, 10));
  const other = row('other', '海が見える', at(1, 10, 10));

  it('arrives at a capture whose text holds none of the query, so the box is drawn', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', wanted.id)?.at.id).toBe(wanted.id);
  });

  it('offers no stepping there, because it is not one of the query matches', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', wanted.id)?.stepping).toBeNull();
  });

  it('finds nothing for a capture that is not there at all', () => {
    expect(arrivalAt([other], '海', 'rtl', captureId('missing'))).toBeNull();
  });
});
