import { describe, expect, it } from 'vitest';
import { imageRect, screenRect } from '$lib/shared/geometry';
import type { ImageRect, ScreenRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { regionsIn, toImageRect, toPageFraction } from './placement';
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

  it.each([
    screenRect(600, 700, 50, 50),
    screenRect(0, 0, 40, 40),
    screenRect(500, 200, 60, 60),
    screenRect(200, 200, 0, 100),
  ])(
    'returns null for a selection that misses the image, touches only its edge or has no extent',
    (selection) => {
      expect(toImageRect(page, selection)).toBeNull();
    },
  );

  it('handles a backwards drag by normalizing it first', () => {
    const forwards = mapped(page, screenRect(200, 200, 100, 150));
    const backwards = mapped(page, screenRect(300, 350, -100, -150));

    expect(plain(backwards)).toEqual(plain(forwards));
  });

  const inside = screenRect(200, 200, 100, 150);

  it.each([
    { image: { ...page, natural: { width: 0, height: 1200 } }, selection: inside },
    { image: { ...page, natural: { width: 800, height: 0 } }, selection: inside },
    { image: { ...page, natural: { width: Number.NaN, height: 1200 } }, selection: inside },
    {
      image: { ...page, natural: { width: 800, height: Number.POSITIVE_INFINITY } },
      selection: inside,
    },
    { image: { ...page, natural: { width: -800, height: 1200 } }, selection: inside },
    {
      image: { ...page, onScreen: screenRect(100, 50, 0, 600) },
      selection: screenRect(0, 0, 1000, 1000),
    },
  ])(
    'returns null for an image with a zero, negative or non-finite natural size, or a zero-size on-screen rect',
    ({ image, selection }) => {
      expect(toImageRect(image, selection)).toBeNull();
    },
  );
});

function square(index: number, top: number): PlacedImage {
  return {
    index: imageIndex(index),
    onScreen: screenRect(0, top, 100, 100),
    natural: { width: 100, height: 100 },
  };
}

describe('regionsIn', () => {
  it.each([
    {
      placed: [page],
      selection: screenRect(200, 200, 100, 150),
      regions: [{ index: 0, rect: { x: 200, y: 300, width: 200, height: 300 } }],
    },
    {
      placed: [slice(0, 0), slice(1, 1000)],
      selection: screenRect(100, 900, 200, 200),
      regions: [
        { index: 0, rect: { x: 100, y: 900, width: 200, height: 100 } },
        { index: 1, rect: { x: 100, y: 0, width: 200, height: 100 } },
      ],
    },
    {
      placed: [square(0, 0), square(1, 300), square(2, 100)],
      selection: screenRect(0, 0, 100, 200),
      regions: [
        { index: 0, rect: { x: 0, y: 0, width: 100, height: 100 } },
        { index: 2, rect: { x: 0, y: 0, width: 100, height: 100 } },
      ],
    },
    {
      placed: [slice(0, 0), { ...slice(1, 1000), natural: { width: 800, height: Number.NaN } }],
      selection: screenRect(100, 900, 200, 200),
      regions: [{ index: 0, rect: { x: 100, y: 900, width: 200, height: 100 } }],
    },
    {
      placed: [slice(0, 0), slice(1, 1000)],
      selection: screenRect(2000, 2000, 50, 50),
      regions: [],
    },
    { placed: [], selection: screenRect(0, 0, 100, 100), regions: [] },
  ])(
    'returns one region per overlapped image, in order, omitting an untouched or unmeasured one',
    ({ placed, selection, regions }) => {
      const found = regionsIn(placed, selection).map((region) => ({
        index: region.index,
        rect: plain(region.rect),
      }));

      expect(found).toEqual(regions);
    },
  );
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

  it.each([
    { natural: { width: 0, height: 0 }, rect: imageRect(0, 0, 10, 10) },
    { natural, rect: imageRect(400, 0, 10, 10) },
  ])('reports nothing for a page with no measured size or a rect lying off it', (row) => {
    expect(toPageFraction(row.natural, row.rect)).toBeNull();
  });
});
