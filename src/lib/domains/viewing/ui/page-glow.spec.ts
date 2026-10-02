import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { glowRegions } from '$lib/shared/image-region';
import type { GlowRegion } from '$lib/shared/image-region';
import { glowOn, shownGlow } from './page-glow';

function region(index: number, x: number): GlowRegion {
  return { index: imageIndex(index), rect: imageRect(x, 0, 10, 10), origin: 'recognized' };
}

describe('glowOn', () => {
  it('keeps only the regions lying on the asked page, whatever their origin', () => {
    const glow = [
      region(1, 0),
      region(2, 0),
      ...glowRegions([{ index: imageIndex(1), rect: imageRect(30, 0, 10, 10) }], 'written'),
    ];

    expect(glowOn(glow, imageIndex(1)).map((found) => [found.rect.x, found.origin])).toEqual([
      [0, 'recognized'],
      [30, 'written'],
    ]);
    expect(glowOn(glow, imageIndex(7))).toEqual([]);
  });
});

describe('shownGlow', () => {
  const named = [region(3, 40)];
  const others = [region(3, 0), region(5, 0)];

  it('shows only the named capture while the setting is off', () => {
    expect(shownGlow(named, others, false)).toBe(named);
  });

  it('shows every capture, the named one first, while the setting is on', () => {
    expect(shownGlow(named, others, true).map((found) => [found.index, found.rect.x])).toEqual([
      [3, 40],
      [3, 0],
      [5, 0],
    ]);
  });

  it('shows the other captures when the url names none and the setting is on', () => {
    expect(shownGlow([], others, true)).toEqual(others);
    expect(shownGlow([], others, false)).toEqual([]);
  });
});
