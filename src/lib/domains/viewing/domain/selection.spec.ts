import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { selectionSize } from './selection';

function region(index: number, width: number, height: number): ImageRegion {
  return { index: imageIndex(index), rect: imageRect(0, 0, width, height) };
}

describe('selectionSize', () => {
  it('sums widths and takes the tallest across a row of two pages', () => {
    expect(selectionSize([region(0, 120, 300), region(1, 80, 260)], 'row')).toEqual({
      width: 200,
      height: 300,
    });
  });

  it('sums heights and takes the widest down a column of two slices', () => {
    expect(selectionSize([region(0, 120, 300), region(1, 80, 260)], 'column')).toEqual({
      width: 120,
      height: 560,
    });
  });

  it('reports one region at its own size in either arrangement', () => {
    const only = [region(4, 92, 104)];
    expect(selectionSize(only, 'row')).toEqual({ width: 92, height: 104 });
    expect(selectionSize(only, 'column')).toEqual({ width: 92, height: 104 });
  });

  it('reports a zero size for no regions at all', () => {
    expect(selectionSize([], 'row')).toEqual({ width: 0, height: 0 });
    expect(selectionSize([], 'column')).toEqual({ width: 0, height: 0 });
  });

  it('counts a region with a zero extent as contributing nothing along it', () => {
    expect(selectionSize([region(0, 0, 300), region(1, 80, 260)], 'row')).toEqual({
      width: 80,
      height: 300,
    });
    expect(selectionSize([region(0, 120, 0), region(1, 80, 260)], 'column')).toEqual({
      width: 120,
      height: 260,
    });
  });

  it('measures a backwards region by its extents rather than its sign', () => {
    const flipped: ImageRegion = { index: imageIndex(0), rect: imageRect(200, 400, -50, -60) };
    expect(selectionSize([flipped], 'row')).toEqual({ width: 50, height: 60 });
  });
});
