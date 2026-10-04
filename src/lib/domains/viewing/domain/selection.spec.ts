import { describe, expect, it } from 'vitest';
import { imageRect, screenRect } from '$lib/shared/geometry';
import type { ImageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { PlacedImage } from './placement';
import { drawnSize, selectionSize, sizeLabel } from './selection';

function drawn(width: number, height: number): ImageRect {
  return imageRect(0, 0, width, height);
}

describe('selectionSize', () => {
  it.each([
    { regions: [drawn(120, 300), drawn(80, 260)], arrangement: 'row', size: [200, 300] },
    { regions: [drawn(120, 300), drawn(80, 260)], arrangement: 'column', size: [120, 560] },
    { regions: [drawn(92, 104)], arrangement: 'row', size: [92, 104] },
    { regions: [drawn(92, 104)], arrangement: 'column', size: [92, 104] },
    { regions: [drawn(0, 300), drawn(80, 260)], arrangement: 'row', size: [80, 300] },
    { regions: [drawn(120, 0), drawn(80, 260)], arrangement: 'column', size: [120, 260] },
  ] as const)(
    'sums the regions along a $arrangement and takes the largest across it',
    ({ regions, arrangement, size: [width, height] }) => {
      expect(selectionSize(regions, arrangement)).toEqual({ width, height });
    },
  );

  it('reports a zero size for no regions at all', () => {
    expect(selectionSize([], 'row')).toEqual({ width: 0, height: 0 });
    expect(selectionSize([], 'column')).toEqual({ width: 0, height: 0 });
  });

  it('measures a backwards region by its extents rather than its sign', () => {
    const flipped = imageRect(200, 400, -50, -60);
    expect(selectionSize([flipped], 'row')).toEqual({ width: 50, height: 60 });
  });
});

describe('drawnSize', () => {
  const PAGES: readonly PlacedImage[] = [
    {
      index: imageIndex(0),
      onScreen: screenRect(0, 0, 50, 100),
      natural: { width: 100, height: 200 },
    },
    {
      index: imageIndex(1),
      onScreen: screenRect(50, 0, 50, 100),
      natural: { width: 100, height: 200 },
    },
  ];

  it('measures a box being drawn in the pixels of the image under it', () => {
    expect(drawnSize(PAGES, screenRect(10, 10, 20, 30), 'row')).toEqual({ width: 40, height: 60 });
  });

  it('adds up the pages a box being drawn crosses', () => {
    expect(drawnSize(PAGES, screenRect(40, 10, 20, 30), 'row')).toEqual({ width: 40, height: 60 });
  });

  it('reports nothing while the box covers no image', () => {
    expect(drawnSize(PAGES, screenRect(200, 10, 20, 30), 'row')).toBeNull();
  });
});

describe('sizeLabel', () => {
  it('writes a size as whole pixels, width first', () => {
    expect(sizeLabel({ width: 40.4, height: 59.6 })).toBe('40 × 60');
  });
});
