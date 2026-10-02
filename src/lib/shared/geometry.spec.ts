import { describe, expect, it } from 'vitest';
import { clampTo, imageRect, isEmpty, normalize, screenRect } from './geometry';

const plain = (r: { x: number; y: number; width: number; height: number }) => ({
  x: r.x,
  y: r.y,
  width: r.width,
  height: r.height,
});

describe('constructors', () => {
  it('builds a plain object with no runtime brand, for screen and image rects alike', () => {
    const r = screenRect(1, 2, 3, 4);
    expect(plain(r)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(Object.keys(r)).toEqual(['x', 'y', 'width', 'height']);
    expect(Object.getOwnPropertySymbols(r)).toEqual([]);
    expect(plain(imageRect(10, 20, 30, 40))).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
});

describe('normalize', () => {
  it.each([
    ['leaves a positive rect unchanged', screenRect(5, 6, 10, 20), [5, 6, 10, 20]],
    ['moves the origin left for a negative width', screenRect(100, 10, -40, 20), [60, 10, 40, 20]],
    ['moves the origin up for a negative height', screenRect(10, 100, 40, -25), [10, 75, 40, 25]],
    [
      'moves the origin for a drag that is backwards on both axes',
      screenRect(100, 100, -40, -25),
      [60, 75, 40, 25],
    ],
  ] as const)('%s', (_name, rect, [x, y, width, height]) => {
    expect(plain(normalize(rect))).toEqual({ x, y, width, height });
  });

  it('keeps a zero-size rect at zero', () => {
    expect(plain(normalize(imageRect(3, 4, 0, 0)))).toEqual({ x: 3, y: 4, width: 0, height: 0 });
  });

  it('returns a new object rather than mutating its argument', () => {
    const r = screenRect(100, 100, -40, -25);
    const n = normalize(r);
    expect(n).not.toBe(r);
    expect(plain(r)).toEqual({ x: 100, y: 100, width: -40, height: -25 });
  });
});

describe('clampTo', () => {
  const bounds = imageRect(0, 0, 100, 100);

  it.each([
    [
      'returns a rect that is fully inside unchanged',
      imageRect(10, 10, 30, 30),
      bounds,
      [10, 10, 30, 30],
    ],
    [
      'trims a rect that overhangs the right and bottom edges',
      imageRect(80, 90, 40, 40),
      bounds,
      [80, 90, 20, 10],
    ],
    [
      'trims a rect that overhangs the left and top edges',
      imageRect(-20, -30, 50, 60),
      bounds,
      [0, 0, 30, 30],
    ],
    [
      'clamps against bounds whose origin is not zero',
      imageRect(0, 0, 100, 100),
      imageRect(20, 20, 50, 50),
      [20, 20, 50, 50],
    ],
    [
      'normalizes a backwards drag before clamping',
      imageRect(50, 50, -80, -80),
      bounds,
      [0, 0, 50, 50],
    ],
  ] as const)('%s', (_name, rect, within, [x, y, width, height]) => {
    expect(plain(clampTo(rect, within))).toEqual({ x, y, width, height });
  });

  it.each([
    ['past the far edges', imageRect(200, 300, 50, 50), 100],
    ['before the near edges', imageRect(-200, -300, 50, 50), 0],
  ] as const)('collapses a rect that lies entirely %s', (_name, rect, corner) => {
    const clamped = clampTo(rect, bounds);
    expect(plain(clamped)).toEqual({ x: corner, y: corner, width: 0, height: 0 });
    expect(isEmpty(clamped)).toBe(true);
  });

  it('returns a new object rather than mutating its argument', () => {
    const r = imageRect(10, 10, 30, 30);
    expect(clampTo(r, bounds)).not.toBe(r);
  });
});

describe('isEmpty', () => {
  it.each([
    ['reports a rect with both extents positive as not empty', screenRect(0, 0, 1, 1), false],
    ['reports a zero width as empty', screenRect(0, 0, 0, 10), true],
    ['reports a zero height as empty', screenRect(0, 0, 10, 0), true],
    ['reports a rect that was never normalized as empty', screenRect(10, 10, -5, 20), true],
  ] as const)('%s', (_name, rect, empty) => {
    expect(isEmpty(rect)).toBe(empty);
  });

  it('reports a rect with no extent at all as empty', () => {
    expect(isEmpty(imageRect(5, 5, 0, 0))).toBe(true);
  });
});
