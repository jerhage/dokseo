import { describe, expect, it } from 'vitest';
import { imageRect, screenRect } from '$lib/shared/geometry';
import type { ScreenRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import {
  dragEnded,
  isClick,
  isTap,
  isUsableSelection,
  MIN_SELECTION_PX,
  selectionFrom,
  selectionSize,
} from './selection';

function region(index: number, width: number, height: number): ImageRegion {
  return { index: imageIndex(index), rect: imageRect(0, 0, width, height) };
}

function plain(r: ScreenRect): { x: number; y: number; width: number; height: number } {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

const empty = { x: 0, y: 0, width: 0, height: 0 };

describe('selectionFrom', () => {
  it('builds a rect from a drag down and to the right', () => {
    expect(plain(selectionFrom({ x: 100, y: 50 }, { x: 260, y: 170 }))).toEqual({
      x: 100,
      y: 50,
      width: 160,
      height: 120,
    });
  });

  it('gives positive extents for a drag up and to the left', () => {
    expect(plain(selectionFrom({ x: 260, y: 170 }, { x: 100, y: 50 }))).toEqual({
      x: 100,
      y: 50,
      width: 160,
      height: 120,
    });
  });

  it('gives positive extents for a drag up and to the right', () => {
    expect(plain(selectionFrom({ x: 100, y: 170 }, { x: 260, y: 50 }))).toEqual({
      x: 100,
      y: 50,
      width: 160,
      height: 120,
    });
  });

  it('gives an empty rect for a drag that goes nowhere', () => {
    expect(plain(selectionFrom({ x: 100, y: 50 }, { x: 100, y: 50 }))).toEqual({
      x: 100,
      y: 50,
      width: 0,
      height: 0,
    });
  });

  it('gives an empty rect at the origin for a non-finite coordinate', () => {
    expect(plain(selectionFrom({ x: Number.NaN, y: 50 }, { x: 260, y: 170 }))).toEqual(empty);
    expect(plain(selectionFrom({ x: 100, y: Number.NaN }, { x: 260, y: 170 }))).toEqual(empty);
    expect(
      plain(selectionFrom({ x: 100, y: 50 }, { x: Number.POSITIVE_INFINITY, y: 170 })),
    ).toEqual(empty);
    expect(
      plain(selectionFrom({ x: 100, y: 50 }, { x: 260, y: Number.NEGATIVE_INFINITY })),
    ).toEqual(empty);
  });
});

describe('isUsableSelection', () => {
  it('accepts a selection exactly at the minimum on both axes', () => {
    expect(isUsableSelection(screenRect(10, 10, MIN_SELECTION_PX, MIN_SELECTION_PX))).toBe(true);
  });

  it('rejects a selection a pixel under the minimum in width', () => {
    expect(isUsableSelection(screenRect(10, 10, MIN_SELECTION_PX - 1, MIN_SELECTION_PX))).toBe(
      false,
    );
  });

  it('rejects a selection a pixel under the minimum in height', () => {
    expect(isUsableSelection(screenRect(10, 10, MIN_SELECTION_PX, MIN_SELECTION_PX - 1))).toBe(
      false,
    );
  });

  it('rejects the misclick a three-pixel drag leaves behind', () => {
    expect(isUsableSelection(selectionFrom({ x: 100, y: 50 }, { x: 103, y: 53 }))).toBe(false);
  });

  it('accepts a selection well over the minimum', () => {
    expect(isUsableSelection(screenRect(10, 10, 300, 180))).toBe(true);
  });

  it('measures a backwards selection by its extents rather than its sign', () => {
    expect(isUsableSelection(screenRect(300, 200, -40, -40))).toBe(true);
    expect(isUsableSelection(screenRect(300, 200, -4, -40))).toBe(false);
  });
});

describe('dragEnded', () => {
  const from = { x: 100, y: 100 };

  it('calls a still pointer a click, so the chrome still toggles', () => {
    expect(dragEnded(from, { x: 100, y: 100 })).toEqual({ kind: 'click' });
  });

  it('forgives the jitter of a hand on a mouse', () => {
    expect(dragEnded(from, { x: 102, y: 101 }).kind).toBe('click');
  });

  it('calls a small drag too small, NOT a click, so the chrome stays put', () => {
    expect(dragEnded(from, { x: 108, y: 104 }).kind).toBe('too-small');
  });

  it('calls a long thin drag too small, though it can select nothing', () => {
    expect(dragEnded(from, { x: 300, y: 104 }).kind).toBe('too-small');
  });

  it('calls a real drag a selection, and carries the rect', () => {
    expect(dragEnded(from, { x: 300, y: 260 })).toEqual({
      kind: 'selection',
      selection: selectionFrom(from, { x: 300, y: 260 }),
    });
  });

  it('is stricter than the touch tap, which forgives a moving finger', () => {
    const drifted = { x: 108, y: 104 };

    expect(dragEnded(from, drifted).kind).toBe('too-small');
    expect(isTap(from, drifted)).toBe(true);
  });
});

describe('isClick', () => {
  const from = { x: 100, y: 100 };

  it('calls a still pointer a click, so the chrome still toggles', () => {
    expect(isClick(from, { x: 100, y: 100 })).toBe(true);
  });

  it('forgives the jitter of a hand on a mouse', () => {
    expect(isClick(from, { x: 102, y: 101 })).toBe(true);
  });

  it('calls any real drag a capture attempt, not a click', () => {
    expect(isClick(from, { x: 108, y: 104 })).toBe(false);
  });

  it('calls a long thin drag a capture attempt, though it selects nothing', () => {
    const thin = { x: 300, y: 104 };

    expect(isClick(from, thin)).toBe(false);
    expect(isUsableSelection(selectionFrom(from, thin))).toBe(false);
  });

  it('is stricter than the touch tap, which forgives a moving finger', () => {
    const drifted = { x: 108, y: 104 };

    expect(isClick(from, drifted)).toBe(false);
    expect(isTap(from, drifted)).toBe(true);
  });
});

describe('isTap', () => {
  it('reads a press that released where it began as a tap', () => {
    expect(isTap({ x: 120, y: 80 }, { x: 120, y: 80 })).toBe(true);
  });

  it('forgives the wobble of a finger under the minimum', () => {
    expect(isTap({ x: 120, y: 80 }, { x: 127, y: 73 })).toBe(true);
  });

  it('rejects a press that travelled the minimum downward', () => {
    expect(isTap({ x: 120, y: 80 }, { x: 120, y: 80 + MIN_SELECTION_PX })).toBe(false);
  });

  it('rejects a press that travelled the minimum upward', () => {
    expect(isTap({ x: 120, y: 80 }, { x: 120, y: 80 - MIN_SELECTION_PX })).toBe(false);
  });

  it('rejects a press that travelled the minimum sideways', () => {
    expect(isTap({ x: 120, y: 80 }, { x: 120 + MIN_SELECTION_PX, y: 80 })).toBe(false);
  });

  it('rejects the flick a strip scrolls with', () => {
    expect(isTap({ x: 200, y: 600 }, { x: 204, y: 190 })).toBe(false);
  });

  it('measures travel by the same minimum a selection is held to', () => {
    const shy = { x: 0, y: MIN_SELECTION_PX - 1 };
    expect([
      isTap({ x: 0, y: 0 }, shy),
      isUsableSelection(selectionFrom({ x: 0, y: 0 }, shy)),
    ]).toEqual([true, false]);
  });
});

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
