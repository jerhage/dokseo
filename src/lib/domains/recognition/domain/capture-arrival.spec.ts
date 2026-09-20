import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex, type CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { arrivalAt, matchesInBookOrder } from './capture-arrival';

type Row = {
  readonly id: CaptureId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
};

function at(index: number, x: number, y: number): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(x, y, 10, 10) }];
}

function row(id: string, text: string, regions: readonly ImageRegion[]): Row {
  return { id: captureId(id), regions, text };
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
    expect(arrival?.ordinal).toBe(2);
    expect(arrival?.total).toBe(3);
  });

  it('names the neighbouring matches', () => {
    const arrival = arrivalAt(ALL, '海', 'rtl', SECOND.id);
    expect(arrival?.previous.id).toBe(FIRST.id);
    expect(arrival?.next.id).toBe(THIRD.id);
  });

  it('wraps from the last match back to the first', () => {
    expect(arrivalAt(ALL, '海', 'rtl', THIRD.id)?.next.id).toBe(FIRST.id);
  });

  it('wraps from the first match back to the last', () => {
    expect(arrivalAt(ALL, '海', 'rtl', FIRST.id)?.previous.id).toBe(THIRD.id);
  });

  it('stands on its own when it is the only match', () => {
    const only = arrivalAt([OTHER], '山', 'rtl', OTHER.id);
    expect(only?.ordinal).toBe(1);
    expect(only?.previous.id).toBe(OTHER.id);
    expect(only?.next.id).toBe(OTHER.id);
  });

  it('reports nothing when the named capture does not match the query', () => {
    expect(arrivalAt(ALL, '海', 'rtl', OTHER.id)).toBeNull();
  });

  it('reports nothing when the named capture is gone', () => {
    expect(arrivalAt(ALL, '海', 'rtl', captureId('missing'))).toBeNull();
  });
});
