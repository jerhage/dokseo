import { describe, expect, it } from 'vitest';
import { screenRect } from '$lib/shared/geometry';
import { regionsIn } from '../domain/placement';
import { naturalSizeOf, placedImages } from './page-placements';

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const BOX: Box = { x: 10, y: 20, width: 300, height: 450 };

function element(
  tagName: string,
  index: string | undefined,
  fields: Record<string, number>,
): Element {
  return {
    tagName,
    dataset: index === undefined ? {} : { imageIndex: index },
    getBoundingClientRect: () => BOX,
    ...fields,
  } as unknown as Element;
}

function image(index: string | undefined, width: number, height: number): Element {
  return element('IMG', index, { naturalWidth: width, naturalHeight: height, width: 1, height: 1 });
}

function canvas(index: string | undefined, width: number, height: number): Element {
  return element('CANVAS', index, { width, height });
}

describe('naturalSizeOf', () => {
  it('reads an image from its natural width and height', () => {
    expect(naturalSizeOf(image('0', 1200, 1700))).toEqual({ width: 1200, height: 1700 });
  });

  it('reads a canvas from its width and height', () => {
    expect(naturalSizeOf(canvas('0', 800, 1100))).toEqual({ width: 800, height: 1100 });
  });

  it('reports nothing for any other element', () => {
    expect(naturalSizeOf(element('DIV', '0', { width: 50, height: 60 }))).toBeNull();
  });
});

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

  it('skips an element that is neither an image nor a canvas', () => {
    expect(placedImages([element('DIV', '0', { width: 50, height: 60 })])).toEqual([]);
  });

  it('skips an element that carries no image index', () => {
    expect(placedImages([image(undefined, 1200, 1700)])).toEqual([]);
  });

  it('skips an element whose image index is not a whole number', () => {
    expect(placedImages([image('half', 1200, 1700)])).toEqual([]);
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

    expect(onLoaded).toEqual([
      {
        index: 0,
        rect: { x: 200, y: 188.88888888888889, width: 400, height: 377.77777777777777 },
      },
    ]);
    expect(onUnloaded).toEqual([]);
  });
});
