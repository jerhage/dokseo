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
  it('builds an anchor of the region kind', () => {
    expect(regionAnchor([region(0)]).kind).toBe('region');
  });

  it('keeps every region it was given, in order', () => {
    const regions = [region(14), region(15), region(16)];

    const anchor = regionAnchor(regions);
    if (anchor.kind !== 'region') throw new Error('expected a region anchor');

    expect(anchor.regions).toEqual(regions);
  });

  it('builds an anchor of no regions at all', () => {
    const anchor = regionAnchor([]);
    if (anchor.kind !== 'region') throw new Error('expected a region anchor');

    expect(anchor.regions).toHaveLength(0);
  });
});

describe('textAnchor', () => {
  it('builds an anchor of the text kind', () => {
    expect(textAnchor('epubcfi(/6/4!/4/2/2/1:0)', quote).kind).toBe('text');
  });

  it('keeps the cfi and the quote it was given', () => {
    const anchor = textAnchor('epubcfi(/6/4!/4/2/2/1:0)', quote);
    if (anchor.kind !== 'text') throw new Error('expected a text anchor');

    expect(anchor.cfi).toBe('epubcfi(/6/4!/4/2/2/1:0)');
    expect(anchor.quote).toEqual(quote);
  });
});

describe('sameAnchorKind', () => {
  it('agrees for two region anchors', () => {
    expect(sameAnchorKind(regionAnchor([region(0)]), regionAnchor([]))).toBe(true);
  });

  it('agrees for two text anchors', () => {
    expect(sameAnchorKind(textAnchor('a', quote), textAnchor('b', quote))).toBe(true);
  });

  it('disagrees across the two kinds', () => {
    expect(sameAnchorKind(regionAnchor([region(0)]), textAnchor('a', quote))).toBe(false);
    expect(sameAnchorKind(textAnchor('a', quote), regionAnchor([region(0)]))).toBe(false);
  });
});
