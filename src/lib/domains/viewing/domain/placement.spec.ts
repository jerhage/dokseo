import { describe, expect, it } from 'vitest';
import { imageRect, screenRect } from '$lib/shared/geometry';
import type { ImageRect, ScreenRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { regionsIn, toImageRect, toPageFraction, toScreenRect } from './placement';
import type { PlacedImage } from './placement';

const page: PlacedImage = {
  index: imageIndex(0),
  onScreen: screenRect(100, 50, 400, 600),
  natural: { width: 800, height: 1200 },
};

function plain(r: ScreenRect | ImageRect): { x: number; y: number; width: number; height: number } {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function mapped(placed: PlacedImage, selection: ScreenRect): ImageRect {
  const rect = toImageRect(placed, selection);
  if (rect === null) throw new Error('expected an overlap');
  return rect;
}

function slice(index: number, top: number): PlacedImage {
  return {
    index: imageIndex(index),
    onScreen: screenRect(0, top, 800, 1000),
    natural: { width: 800, height: 1000 },
  };
}

describe('toImageRect', () => {
  it('maps a selection inside one image to natural pixels', () => {
    expect(plain(mapped(page, screenRect(200, 200, 100, 150)))).toEqual({
      x: 200,
      y: 300,
      width: 200,
      height: 300,
    });
  });

  it('maps a selection hanging off an edge to the overlapping part only', () => {
    expect(plain(mapped(page, screenRect(400, 550, 300, 300)))).toEqual({
      x: 600,
      y: 1000,
      width: 200,
      height: 200,
    });
  });

  it('returns null for a selection that misses the image entirely', () => {
    expect(toImageRect(page, screenRect(600, 700, 50, 50))).toBeNull();
    expect(toImageRect(page, screenRect(0, 0, 40, 40))).toBeNull();
  });

  it('returns null for a selection that only touches an edge', () => {
    expect(toImageRect(page, screenRect(500, 200, 60, 60))).toBeNull();
  });

  it('returns null for a selection with no extent', () => {
    expect(toImageRect(page, screenRect(200, 200, 0, 100))).toBeNull();
  });

  it('handles a backwards drag by normalizing it first', () => {
    const forwards = mapped(page, screenRect(200, 200, 100, 150));
    const backwards = mapped(page, screenRect(300, 350, -100, -150));

    expect(plain(backwards)).toEqual(plain(forwards));
  });

  it('returns null for an image with a zero, negative or non-finite natural size', () => {
    const selection = screenRect(200, 200, 100, 150);
    const suspect: readonly PlacedImage[] = [
      { ...page, natural: { width: 0, height: 1200 } },
      { ...page, natural: { width: 800, height: 0 } },
      { ...page, natural: { width: Number.NaN, height: 1200 } },
      { ...page, natural: { width: 800, height: Number.POSITIVE_INFINITY } },
      { ...page, natural: { width: -800, height: 1200 } },
    ];

    for (const image of suspect) expect(toImageRect(image, selection)).toBeNull();
  });

  it('returns null for an image with a zero-size on-screen rect', () => {
    const flat: PlacedImage = { ...page, onScreen: screenRect(100, 50, 0, 600) };

    expect(toImageRect(flat, screenRect(0, 0, 1000, 1000))).toBeNull();
  });
});

describe('toScreenRect', () => {
  it('places a stored region back onto the screen', () => {
    expect(plain(toScreenRect(page, imageRect(200, 300, 200, 300)))).toEqual({
      x: 200,
      y: 200,
      width: 100,
      height: 150,
    });
  });

  it('round-trips a rect through the screen and back to within a pixel', () => {
    const original = imageRect(137, 409, 251, 318);

    const back = mapped(page, toScreenRect(page, original));

    expect(back.x).toBeCloseTo(original.x, 0);
    expect(back.y).toBeCloseTo(original.y, 0);
    expect(back.width).toBeCloseTo(original.width, 0);
    expect(back.height).toBeCloseTo(original.height, 0);
  });

  it('collapses to an empty rect for an image with a zero natural size', () => {
    const broken: PlacedImage = { ...page, natural: { width: 0, height: 1200 } };

    expect(plain(toScreenRect(broken, imageRect(0, 0, 10, 10)))).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe('regionsIn', () => {
  it('returns one region for a selection inside a single image', () => {
    const regions = regionsIn([page], screenRect(200, 200, 100, 150));

    expect(regions).toHaveLength(1);
    expect(at(regions, 0).index).toBe(imageIndex(0));
    expect(plain(at(regions, 0).rect)).toEqual({ x: 200, y: 300, width: 200, height: 300 });
  });

  it('returns one region per overlapped image, in order, across a slice boundary', () => {
    const regions = regionsIn([slice(0, 0), slice(1, 1000)], screenRect(100, 900, 200, 200));

    expect(regions).toHaveLength(2);
    expect(at(regions, 0).index).toBe(imageIndex(0));
    expect(plain(at(regions, 0).rect)).toEqual({ x: 100, y: 900, width: 200, height: 100 });
    expect(at(regions, 1).index).toBe(imageIndex(1));
    expect(plain(at(regions, 1).rect)).toEqual({ x: 100, y: 0, width: 200, height: 100 });
  });

  it('omits an untouched image that sits between two touched ones', () => {
    const near: PlacedImage = {
      index: imageIndex(0),
      onScreen: screenRect(0, 0, 100, 100),
      natural: { width: 100, height: 100 },
    };
    const far: PlacedImage = {
      index: imageIndex(1),
      onScreen: screenRect(0, 300, 100, 100),
      natural: { width: 100, height: 100 },
    };
    const alsoNear: PlacedImage = {
      index: imageIndex(2),
      onScreen: screenRect(0, 100, 100, 100),
      natural: { width: 100, height: 100 },
    };

    const regions = regionsIn([near, far, alsoNear], screenRect(0, 0, 100, 200));

    expect(regions).toHaveLength(2);
    expect(at(regions, 0).index).toBe(imageIndex(0));
    expect(at(regions, 1).index).toBe(imageIndex(2));
  });

  it('returns nothing when the selection touches no image', () => {
    expect(regionsIn([slice(0, 0), slice(1, 1000)], screenRect(2000, 2000, 50, 50))).toEqual([]);
    expect(regionsIn([], screenRect(0, 0, 100, 100))).toEqual([]);
  });

  it('omits an image with a zero or non-finite natural size', () => {
    const broken: PlacedImage = { ...slice(1, 1000), natural: { width: 800, height: Number.NaN } };

    const regions = regionsIn([slice(0, 0), broken], screenRect(100, 900, 200, 200));

    expect(regions).toHaveLength(1);
    expect(at(regions, 0).index).toBe(imageIndex(0));
  });
});

describe('toPageFraction', () => {
  const natural = { width: 200, height: 400 };

  it('states a rect as a percentage of the page it sits on', () => {
    expect(toPageFraction(natural, imageRect(50, 100, 100, 200))).toEqual({
      left: 25,
      top: 25,
      width: 50,
      height: 50,
    });
  });

  it('holds a rect that overruns the page inside it', () => {
    expect(toPageFraction(natural, imageRect(100, 200, 400, 800))).toEqual({
      left: 50,
      top: 50,
      width: 50,
      height: 50,
    });
  });

  it('turns a rect drawn backwards the right way round', () => {
    expect(toPageFraction(natural, imageRect(150, 300, -100, -200))).toEqual({
      left: 25,
      top: 25,
      width: 50,
      height: 50,
    });
  });

  it('reports nothing for a page with no measured size', () => {
    expect(toPageFraction({ width: 0, height: 0 }, imageRect(0, 0, 10, 10))).toBeNull();
  });

  it('reports nothing for a rect lying off the page', () => {
    expect(toPageFraction(natural, imageRect(400, 0, 10, 10))).toBeNull();
  });
});
