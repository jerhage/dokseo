import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { arrivalAt, matchesInBookOrder, soughtPassage } from './capture-arrival';

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
  const FOURTH = row('e', '海辺', at(5, 10, 10));
  const MORE = [THIRD, FOURTH, OTHER, SECOND, FIRST];

  function ids(found: readonly Row[] | undefined): readonly CaptureId[] | undefined {
    return found?.map((capture) => capture.id);
  }

  it('arrives at every match on the image, in reading order', () => {
    expect(ids(arrivalAt(MORE, '海', 'rtl', imageIndex(3))?.at)).toEqual([FIRST.id, SECOND.id]);
  });

  it('counts the images holding matches, not the matches', () => {
    const arrival = arrivalAt(MORE, '海', 'rtl', imageIndex(5));
    expect(arrival?.stepping?.ordinal).toBe(2);
    expect(arrival?.stepping?.total).toBe(3);
  });

  it('names the neighbouring images that hold matches', () => {
    const arrival = arrivalAt(MORE, '海', 'rtl', imageIndex(5));
    expect(arrival?.stepping?.previous).toBe(imageIndex(3));
    expect(arrival?.stepping?.next).toBe(imageIndex(9));
  });

  it('steps past every match on the image at once', () => {
    expect(arrivalAt(MORE, '海', 'rtl', imageIndex(3))?.stepping?.next).toBe(imageIndex(5));
  });

  it('wraps from the last image back to the first', () => {
    expect(arrivalAt(MORE, '海', 'rtl', imageIndex(9))?.stepping?.next).toBe(imageIndex(3));
  });

  it('wraps from the first image back to the last', () => {
    expect(arrivalAt(MORE, '海', 'rtl', imageIndex(3))?.stepping?.previous).toBe(imageIndex(9));
  });

  it('arrives at the one capture on an image holding one match, as a capture id once did', () => {
    const arrival = arrivalAt(MORE, '海', 'rtl', imageIndex(9));
    expect(ids(arrival?.at)).toEqual([THIRD.id]);
    expect(arrival?.stepping?.ordinal).toBe(3);
  });

  it('stands on its own when its image holds the only match', () => {
    const only = arrivalAt([OTHER], '山', 'rtl', imageIndex(1));
    expect(only?.stepping?.ordinal).toBe(1);
    expect(only?.stepping?.previous).toBe(imageIndex(1));
    expect(only?.stepping?.next).toBe(imageIndex(1));
  });

  it('arrives at every capture on the image without a query, and offers no stepping', () => {
    const arrival = arrivalAt(MORE, null, 'rtl', imageIndex(3));
    expect(ids(arrival?.at)).toEqual([FIRST.id, SECOND.id]);
    expect(arrival?.stepping).toBeNull();
  });

  it('treats a query of only spaces as no query at all', () => {
    expect(arrivalAt(MORE, '  ', 'rtl', imageIndex(3))?.stepping).toBeNull();
  });

  it('reports nothing for an image that holds no capture', () => {
    expect(arrivalAt(MORE, null, 'rtl', imageIndex(2))).toBeNull();
    expect(arrivalAt(MORE, '海', 'rtl', imageIndex(2))).toBeNull();
  });

  it('places a capture on the image its first region sits on', () => {
    const spread = row(
      's',
      '海',
      regionAnchor([
        { index: imageIndex(6), rect: imageRect(0, 0, 10, 10) },
        { index: imageIndex(7), rect: imageRect(0, 0, 10, 10) },
      ]),
    );

    expect(ids(arrivalAt([spread], '海', 'rtl', imageIndex(6))?.at)).toEqual([spread.id]);
    expect(arrivalAt([spread], '海', 'rtl', imageIndex(7))).toBeNull();
  });
});

describe('arrivalAt on an image the query never matched', () => {
  const wanted = row('tagged', 'この坂を上れば', at(0, 10, 10));
  const other = row('other', '海が見える', at(1, 10, 10));

  it('arrives at the captures there even though none holds the query, so the box is drawn', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', imageIndex(0))?.at.map((c) => c.id)).toEqual([
      wanted.id,
    ]);
  });

  it('offers no stepping there, because it is not one of the query matches', () => {
    expect(arrivalAt([other, wanted], '海', 'rtl', imageIndex(0))?.stepping).toBeNull();
  });
});

describe('soughtPassage', () => {
  const CFI = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';
  const QUOTE = { exact: '灯台', prefix: 'あの', suffix: 'へ' };

  it('seeks the cfi with the quote of a passage lifted at exactly that cfi', () => {
    expect(soughtPassage([at(0, 0, 0), textAnchor(CFI, QUOTE)], CFI)).toEqual({
      cfi: CFI,
      quote: QUOTE,
    });
  });

  it('seeks the cfi alone when no capture was lifted there', () => {
    expect(soughtPassage([textAnchor('epubcfi(/6/2)', QUOTE)], CFI)).toEqual({
      cfi: CFI,
      quote: null,
    });
  });
});
