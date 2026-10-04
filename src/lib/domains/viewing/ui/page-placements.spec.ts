import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screenRect } from '$lib/shared/geometry';
import { regionsIn } from '../domain/placement';
import { placedImages } from './page-placements';

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const BOX: Box = { x: 10, y: 20, width: 300, height: 450 };

class FakeElement {
  readonly dataset: Record<string, string>;

  constructor(index: string | undefined) {
    this.dataset = index === undefined ? {} : { imageIndex: index };
  }

  getBoundingClientRect(): Box {
    return BOX;
  }
}

class FakeHtmlElement extends FakeElement {}

class FakeImage extends FakeHtmlElement {
  readonly width = 1;
  readonly height = 1;
  readonly naturalWidth: number;
  readonly naturalHeight: number;

  constructor(index: string | undefined, naturalWidth: number, naturalHeight: number) {
    super(index);
    this.naturalWidth = naturalWidth;
    this.naturalHeight = naturalHeight;
  }
}

class FakeCanvas extends FakeHtmlElement {
  readonly width: number;
  readonly height: number;

  constructor(index: string | undefined, width: number, height: number) {
    super(index);
    this.width = width;
    this.height = height;
  }
}

beforeEach(() => {
  vi.stubGlobal('HTMLElement', FakeHtmlElement);
  vi.stubGlobal('HTMLImageElement', FakeImage);
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function image(index: string | undefined, width: number, height: number): Element {
  return new FakeImage(index, width, height) as unknown as Element;
}

function canvas(index: string | undefined, width: number, height: number): Element {
  return new FakeCanvas(index, width, height) as unknown as Element;
}

function division(index: string): Element {
  return new FakeHtmlElement(index) as unknown as Element;
}

describe('placedImages', () => {
  it('places an image at its natural size', () => {
    const placed = placedImages([image('3', 1200, 1700)]);

    expect(placed).toEqual([
      {
        index: 3,
        onScreen: { x: 10, y: 20, width: 300, height: 450 },
        natural: { width: 1200, height: 1700 },
      },
    ]);
  });

  it('places a canvas at its natural size', () => {
    const placed = placedImages([canvas('1', 800, 1100)]);

    expect(placed).toEqual([
      {
        index: 1,
        onScreen: { x: 10, y: 20, width: 300, height: 450 },
        natural: { width: 800, height: 1100 },
      },
    ]);
  });

  it('places both element kinds in the order they were found', () => {
    const placed = placedImages([image('0', 1200, 1700), canvas('1', 800, 1100)]);

    expect(placed.map((page) => page.index)).toEqual([0, 1]);
    expect(placed.map((page) => page.natural.width)).toEqual([1200, 800]);
  });

  it.each([
    { element: () => division('0'), what: 'that is neither an image nor a canvas' },
    { element: () => image(undefined, 1200, 1700), what: 'that carries no image index' },
    { element: () => image('half', 1200, 1700), what: 'whose image index is not a whole number' },
  ])('skips an element $what', ({ element }) => {
    expect(placedImages([element()])).toEqual([]);
  });

  it('reports a zero natural size for an image that has not loaded', () => {
    expect(placedImages([image('0', 0, 0)])).toEqual([
      {
        index: 0,
        onScreen: { x: 10, y: 20, width: 300, height: 450 },
        natural: { width: 0, height: 0 },
      },
    ]);
  });

  it('maps a selection onto an image page and onto nothing on an unloaded one', () => {
    const selection = screenRect(60, 70, 100, 100);

    const onLoaded = regionsIn(placedImages([image('0', 1200, 1700)]), selection);
    const onUnloaded = regionsIn(placedImages([image('0', 0, 0)]), selection);

    expect(onLoaded.map((region) => region.index)).toEqual([0]);
    expect(onLoaded[0]?.rect.x).toBeCloseTo(1 / 6, 12);
    expect(onLoaded[0]?.rect.y).toBeCloseTo(1 / 9, 12);
    expect(onLoaded[0]?.rect.width).toBeCloseTo(1 / 3, 12);
    expect(onLoaded[0]?.rect.height).toBeCloseTo(2 / 9, 12);
    expect(onUnloaded).toEqual([]);
  });
});
