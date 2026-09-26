import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { ScrubSource } from './page-scrubber';
import { scrubPlace, stepMarker } from './page-scrubber';

const SPREADS: ScrubSource = {
  layout: 'paged',
  groups: [[imageIndex(0)], [imageIndex(1), imageIndex(2)], [imageIndex(3), imageIndex(4)]],
  group: 1,
  index: imageIndex(1),
  total: 5,
};

const STRIP: ScrubSource = {
  layout: 'continuous',
  groups: [[imageIndex(0)], [imageIndex(1)]],
  group: 0,
  index: imageIndex(7),
  total: 40,
};

describe('scrubPlace', () => {
  it('steps through the page groups of a paged book', () => {
    expect(scrubPlace(SPREADS)).toEqual({ steps: 3, at: 1 });
  });

  it('steps through every image of a strip, whatever its groups', () => {
    expect(scrubPlace(STRIP)).toEqual({ steps: 40, at: 7 });
  });

  it('keeps the place on the last step when the position runs past it', () => {
    expect(scrubPlace({ ...SPREADS, group: 9 })).toEqual({ steps: 3, at: 2 });
  });

  it('reports no steps and the first place for a book with no groups', () => {
    expect(scrubPlace({ ...SPREADS, groups: [], total: 0 })).toEqual({ steps: 0, at: 0 });
  });
});

describe('stepMarker', () => {
  it('names both pages of a spread, padded to three digits', () => {
    expect(stepMarker(SPREADS, 2)).toBe('004–005 / 5');
  });

  it('names the single image at a strip step', () => {
    expect(stepMarker(STRIP, 12)).toBe('013 / 40');
  });

  it('prints a dash for a step that holds no page', () => {
    expect(stepMarker(SPREADS, 3)).toBe('— / 5');
    expect(stepMarker(STRIP, 40)).toBe('— / 40');
  });
});
