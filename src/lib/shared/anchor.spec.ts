import { describe, expect, it } from 'vitest';
import { regionAnchor, sameAnchorKind, textAnchor } from './anchor';
import { imageRect } from './geometry';
import { imageIndex } from './ids';
import type { ImageRegion } from './image-region';

function region(index: number): ImageRegion {
  return { index: imageIndex(index), rect: imageRect(index, index, 10, 10) };
}

const quote = { exact: '猫である', prefix: '吾輩は', suffix: '。' };

describe('regionAnchor', () => {
  it.each([
    ['every one of three regions', [region(14), region(15), region(16)]],
    ['a single region', [region(0)]],
    ['an empty list of regions', []],
  ])('keeps %s it was given, in order', (_name, regions) => {
    const anchor = regionAnchor(regions);
    if (anchor.kind !== 'region') throw new Error('expected a region anchor');

    expect(anchor.regions).toEqual(regions);
  });
});

describe('textAnchor', () => {
  it('keeps the cfi and the quote it was given', () => {
    const anchor = textAnchor('epubcfi(/6/4!/4/2/2/1:0)', quote, null);
    if (anchor.kind !== 'text') throw new Error('expected a text anchor');

    expect(anchor.cfi).toBe('epubcfi(/6/4!/4/2/2/1:0)');
    expect(anchor.quote).toEqual(quote);
  });
});

describe('sameAnchorKind', () => {
  it.each([
    ['two region anchors', regionAnchor([region(0)]), regionAnchor([]), true],
    ['two text anchors', textAnchor('a', quote, null), textAnchor('b', quote, null), true],
    ['a region then a text anchor', regionAnchor([region(0)]), textAnchor('a', quote, null), false],
    ['a text then a region anchor', textAnchor('a', quote, null), regionAnchor([region(0)]), false],
  ])('agrees on the kind of %s only when they share it', (_name, one, other, same) => {
    expect(sameAnchorKind(one, other)).toBe(same);
  });
});
