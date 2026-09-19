import { describe, expect, it } from 'vitest';
import { screenRect, type ScreenRect } from '$lib/shared/geometry';
import { isUsableSelection, MIN_SELECTION_PX, selectionFrom } from './selection';

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
