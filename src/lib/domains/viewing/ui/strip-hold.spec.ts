import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import { layOutStrip } from '../domain/strip';
import { heldAround, heldAt, heldAtScroll, scrollForHold } from './strip-hold';
import type { StripHold } from './strip-hold';

const SIZES = [
  { width: 100, height: 200 },
  { width: 100, height: 100 },
  { width: 100, height: 300 },
];

const WIDTH = 400;

const LAYOUT = layOutStrip(SIZES, WIDTH);

const PREVIOUS: StripHold = {
  position: { index: imageIndex(2), offset: 0.75 },
  top: 30,
  across: 0.4,
  left: 12,
};

describe('heldAtScroll', () => {
  it('holds the place at the top of the scroll and the share across it', () => {
    expect(heldAtScroll(LAYOUT, WIDTH, PREVIOUS, { top: 1000, left: 100 })).toEqual({
      position: { index: imageIndex(1), offset: 0.5 },
      top: 0,
      across: 0.25,
      left: 0,
    });
  });

  it('holds nothing across a strip with no width', () => {
    expect(heldAtScroll(LAYOUT, 0, PREVIOUS, { top: 0, left: 100 }).across).toBe(0);
  });

  it('keeps the place it held when the strip has no slices', () => {
    expect(heldAtScroll([], WIDTH, PREVIOUS, { top: 1000, left: 0 }).position).toBe(
      PREVIOUS.position,
    );
  });
});

describe('heldAround', () => {
  it.each<{
    readonly scroll: { readonly top: number; readonly left: number };
    readonly was: { readonly x: number; readonly y: number };
    readonly now: { readonly x: number; readonly y: number };
    readonly hold: StripHold;
  }>([
    {
      scroll: { top: 800, left: 100 },
      was: { x: 200, y: 200 },
      now: { x: 50, y: 100 },
      hold: { position: { index: imageIndex(1), offset: 0.5 }, top: 100, across: 0.75, left: 50 },
    },
    {
      scroll: { top: 0, left: 100 },
      was: { x: 100, y: 0 },
      now: { x: 0, y: 0 },
      hold: { position: { index: imageIndex(0), offset: 0 }, top: 0, across: 0.5, left: 0 },
    },
  ])(
    'holds the place under where the pinch began, measured across from the scroll left plus the point, and pins it where the fingers are now',
    ({ scroll, was, now, hold }) => {
      expect(heldAround(LAYOUT, WIDTH, PREVIOUS, scroll, was, now)).toEqual(hold);
    },
  );

  it('holds nothing across a strip with no width', () => {
    const point = { x: 10, y: 10 };

    expect(heldAround(LAYOUT, 0, PREVIOUS, { top: 0, left: 5 }, point, point).across).toBe(0);
  });

  it('keeps the place it held when the strip has no slices', () => {
    const point = { x: 10, y: 10 };

    expect(heldAround([], WIDTH, PREVIOUS, { top: 0, left: 0 }, point, point).position).toBe(
      PREVIOUS.position,
    );
  });

  it('scrolls back to keep the point under the fingers at the same zoom', () => {
    const scroll = { top: 900, left: 40 };
    const was = { x: 120, y: 260 };
    const now = { x: 80, y: 200 };

    const target = scrollForHold(
      LAYOUT,
      WIDTH,
      heldAround(LAYOUT, WIDTH, PREVIOUS, scroll, was, now),
    );

    expect(target.top).toBeCloseTo(scroll.top + was.y - now.y);
    expect(target.left).toBeCloseTo(scroll.left + was.x - now.x);
  });
});

describe('heldAt', () => {
  it('holds a new place at its top and keeps the share across', () => {
    const position = { index: imageIndex(0), offset: 0.1 };

    expect(heldAt(PREVIOUS, position)).toEqual({ position, top: 0, across: 0.4, left: 0 });
  });
});

describe('scrollForHold', () => {
  it('scrolls to the held place less its pin, and across less its left', () => {
    const hold: StripHold = {
      position: { index: imageIndex(1), offset: 0.5 },
      top: 100,
      across: 0.5,
      left: 50,
    };

    expect(scrollForHold(LAYOUT, WIDTH, hold)).toEqual({ top: 900, left: 150 });
  });

  it('scales the left with the width it is given', () => {
    const hold: StripHold = { position: PREVIOUS.position, top: 0, across: 0.5, left: 0 };

    expect(scrollForHold(LAYOUT, 800, hold).left).toBe(400);
  });
});
