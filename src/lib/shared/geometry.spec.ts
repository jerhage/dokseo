import { describe, expect, it } from 'vitest';
import {
  clampTo,
  fitsOnPage,
  imageRect,
  imageRectOf,
  isEmpty,
  normalize,
  pageRect,
  pageRectOf,
  screenRect,
} from './geometry';
import type { PageRect } from './geometry';

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

describe('fitsOnPage', () => {
  it.each([
    ['a rect inside the page', pageRect(0.1, 0.2, 0.3, 0.4)],
    ['the whole page', pageRect(0, 0, 1, 1)],
    ['a rect touching the right and bottom edges', pageRect(0.75, 0.5, 0.25, 0.5)],
  ])('passes %s', (_name, rect) => {
    expect(fitsOnPage(rect)).toBe(true);
  });

  it.each([
    ['a negative x', pageRect(-0.01, 0, 0.5, 0.5)],
    ['a negative y', pageRect(0, -0.01, 0.5, 0.5)],
    ['a zero width', pageRect(0.1, 0.1, 0, 0.5)],
    ['a zero height', pageRect(0.1, 0.1, 0.5, 0)],
    ['a negative width', pageRect(0.6, 0.1, -0.5, 0.5)],
    ['a right edge past the page', pageRect(0.6, 0, 0.5, 0.5)],
    ['a bottom edge past the page', pageRect(0, 0.6, 0.5, 0.5)],
    ['a right edge a hair past the page', pageRect(0.5, 0, 0.5000000002, 0.5)],
    ['a NaN', pageRect(Number.NaN, 0, 0.5, 0.5)],
    ['an infinite width', pageRect(0, 0, Number.POSITIVE_INFINITY, 0.5)],
    ['a rect in pixels', pageRect(120, 64, 88, 240)],
  ])('rejects %s', (_name, rect) => {
    expect(fitsOnPage(rect)).toBe(false);
  });
});

describe('pageRectOf', () => {
  const natural = { width: 800, height: 1200 };

  it('states a pixel rect as fractions of the natural size', () => {
    expect(
      plain(pageRectOf(imageRect(200, 300, 400, 600), natural) ?? pageRect(0, 0, 0, 0)),
    ).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  });

  it('turns a rect drawn backwards the right way round', () => {
    const rect = pageRectOf(imageRect(600, 900, -400, -600), natural);

    expect(rect === null ? null : plain(rect)).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
    });
  });

  it('clamps a rect that overshoots the page, by a float hair or by far, onto it', () => {
    const hair = pageRectOf(imageRect(400, 0, 400.0000001, 1200.0000001), natural);
    const far = pageRectOf(imageRect(-100, -100, 2000, 2000), natural);

    expect(hair === null ? null : plain(hair)).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
    expect(far === null ? null : plain(far)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it.each([
    ['a page with no measured size', imageRect(0, 0, 10, 10), { width: 0, height: 0 }],
    ['a page with a NaN size', imageRect(0, 0, 10, 10), { width: Number.NaN, height: 100 }],
    ['an empty rect', imageRect(10, 10, 0, 10), natural],
    ['a rect lying off the page', imageRect(900, 0, 10, 10), natural],
  ])('makes nothing for %s', (_name, rect, size) => {
    expect(pageRectOf(rect, size)).toBeNull();
  });

  it('makes only rects that fitsOnPage accepts, for selections reaching every edge', () => {
    const sizes = [
      { width: 1191, height: 1684 },
      { width: 723, height: 1023 },
      { width: 3, height: 7 },
    ];
    const made: PageRect[] = [];
    for (const size of sizes) {
      for (let step = 0; step < 40; step += 1) {
        const x = ((size.width - 1) * step) / 41 + 1 / 3;
        const y = ((size.height - 1) * (40 - step)) / 41 + 1 / 7;
        const rect = pageRectOf(imageRect(x, y, size.width - x, size.height - y + 1e-9), size);
        if (rect !== null) made.push(rect);
      }
    }

    expect(made).toHaveLength(sizes.length * 40);
    expect(made.filter((rect) => !fitsOnPage(rect))).toEqual([]);
  });
});

describe('imageRectOf', () => {
  it('scales fractions to the pixels of the size the page is drawn at', () => {
    const rect = pageRect(0.25, 0.5, 0.5, 0.25);

    expect(plain(imageRectOf(rect, { width: 800, height: 1200 }))).toEqual({
      x: 200,
      y: 600,
      width: 400,
      height: 300,
    });
    expect(plain(imageRectOf(rect, { width: 1600, height: 2400 }))).toEqual({
      x: 400,
      y: 1200,
      width: 800,
      height: 600,
    });
  });

  it('lands a whole pixel edge on the whole pixel, not a hair beside it', () => {
    const natural = { width: 720, height: 960 };
    const stored = pageRectOf(imageRect(382, 52, 279, 384), natural);
    if (stored === null) throw new Error('expected a rect');

    expect(plain(imageRectOf(stored, natural))).toEqual({ x: 382, y: 52, width: 279, height: 384 });
  });

  it('round-trips a pixel rect through fractions within a millionth of a pixel', () => {
    const natural = { width: 1191, height: 1684 };
    const original = imageRect(183.123456, 73.654321, 108.4, 76.6);
    const stored = pageRectOf(original, natural);
    if (stored === null) throw new Error('expected a rect');
    const back = imageRectOf(stored, natural);

    expect(Math.abs(back.x - original.x)).toBeLessThan(1e-6);
    expect(Math.abs(back.y - original.y)).toBeLessThan(1e-6);
    expect(Math.abs(back.width - original.width)).toBeLessThan(1e-6);
    expect(Math.abs(back.height - original.height)).toBeLessThan(1e-6);
  });

  it('round-trips fractions through pixels within a billionth of the page', () => {
    const original = pageRect(0.123456789, 0.987654321 - 0.5, 0.31, 0.27);
    const natural = { width: 2481, height: 3508 };
    const back = pageRectOf(imageRectOf(original, natural), natural);
    if (back === null) throw new Error('expected a rect');

    expect(Math.abs(back.x - original.x)).toBeLessThan(1e-9);
    expect(Math.abs(back.y - original.y)).toBeLessThan(1e-9);
    expect(Math.abs(back.width - original.width)).toBeLessThan(1e-9);
    expect(Math.abs(back.height - original.height)).toBeLessThan(1e-9);
  });
});
