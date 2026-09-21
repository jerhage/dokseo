import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { glowRegions } from '$lib/shared/image-region';
import type { GlowRegion } from '$lib/shared/image-region';
import { glowMarker, glowOn, NOTE_MARKER, READING_MARKER } from './page-glow';

function region(index: number, x: number): GlowRegion {
  return { index: imageIndex(index), rect: imageRect(x, 0, 10, 10), origin: 'recognized' };
}

describe('glowOn', () => {
  it('keeps only the regions lying on the asked page', () => {
    const glow = [region(1, 0), region(2, 0), region(1, 30)];

    expect(glowOn(glow, imageIndex(1)).map((found) => found.rect.x)).toEqual([0, 30]);
  });

  it('carries both origins onto one page', () => {
    const glow = [
      ...glowRegions([{ index: imageIndex(4), rect: imageRect(0, 0, 10, 10) }], 'recognized'),
      ...glowRegions([{ index: imageIndex(4), rect: imageRect(20, 0, 10, 10) }], 'written'),
    ];

    expect(glowOn(glow, imageIndex(4)).map((found) => found.origin)).toEqual([
      'recognized',
      'written',
    ]);
  });

  it('finds nothing on a page no region touches', () => {
    expect(glowOn([region(1, 0)], imageIndex(7))).toEqual([]);
  });
});

describe('glowMarker', () => {
  it('says nothing when no box is drawn on the page', () => {
    expect(glowMarker([])).toBeNull();
  });

  it('names a note, so a reader knows the yellow box is their own writing', () => {
    const written = glowRegions(
      [{ index: imageIndex(0), rect: imageRect(0, 0, 10, 10) }],
      'written',
    );

    expect(glowMarker(written)).toBe(NOTE_MARKER);
    expect(NOTE_MARKER).toBe('NOTE');
  });

  it('keeps the old wording for a reading', () => {
    expect(glowMarker([region(0, 0)])).toBe(READING_MARKER);
  });
});
