import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { inBookOrder } from './capture-order';

type Placed = { readonly name: string; readonly regions: readonly ImageRegion[] };

function at(name: string, index: number, x: number, y: number, width = 100, height = 60): Placed {
  return { name, regions: [{ index: imageIndex(index), rect: imageRect(x, y, width, height) }] };
}

function names(placed: readonly Placed[]): readonly string[] {
  return placed.map((one) => one.name);
}

describe('inBookOrder', () => {
  it('orders across pages by image index', () => {
    const ordered = inBookOrder([at('later', 7, 0, 0), at('earlier', 3, 0, 0)], 'ltr');

    expect(names(ordered)).toEqual(['earlier', 'later']);
  });

  it('orders across pages by image index whichever way the book reads', () => {
    const ordered = inBookOrder([at('later', 7, 0, 0), at('earlier', 3, 0, 0)], 'rtl');

    expect(names(ordered)).toEqual(['earlier', 'later']);
  });

  it('orders a right-to-left page from the right edge inward', () => {
    const ordered = inBookOrder([at('left', 1, 20, 500), at('right', 1, 600, 900)], 'rtl');

    expect(names(ordered)).toEqual(['right', 'left']);
  });

  it('orders a left-to-right page from the top down', () => {
    const ordered = inBookOrder([at('low', 1, 600, 900), at('high', 1, 20, 500)], 'ltr');

    expect(names(ordered)).toEqual(['high', 'low']);
  });

  it('orders a right-to-left column from the top down', () => {
    const ordered = inBookOrder([at('low', 1, 600, 900), at('high', 1, 600, 100)], 'rtl');

    expect(names(ordered)).toEqual(['high', 'low']);
  });

  it('orders a left-to-right row from the left', () => {
    const ordered = inBookOrder([at('right', 1, 600, 100), at('left', 1, 20, 100)], 'ltr');

    expect(names(ordered)).toEqual(['left', 'right']);
  });

  it('reads a wider right-to-left region from its right edge, not its left', () => {
    const ordered = inBookOrder([at('narrow', 1, 400, 0, 100), at('wide', 1, 100, 0, 420)], 'rtl');

    expect(names(ordered)).toEqual(['wide', 'narrow']);
  });

  it('uses only the first region of a capture that spans a seam', () => {
    const spanning: Placed = {
      name: 'spanning',
      regions: [
        { index: imageIndex(4), rect: imageRect(0, 900, 100, 60) },
        { index: imageIndex(5), rect: imageRect(0, 0, 100, 60) },
      ],
    };
    const ordered = inBookOrder([at('single', 5, 0, 0), spanning], 'ltr');

    expect(names(ordered)).toEqual(['spanning', 'single']);
  });

  it('sorts a capture holding no regions last', () => {
    const nowhere: Placed = { name: 'nowhere', regions: [] };
    const ordered = inBookOrder([nowhere, at('placed', 9, 0, 0)], 'ltr');

    expect(names(ordered)).toEqual(['placed', 'nowhere']);
  });

  it('keeps two captures holding no regions in the order they arrived', () => {
    const first: Placed = { name: 'first', regions: [] };
    const second: Placed = { name: 'second', regions: [] };
    const ordered = inBookOrder([first, second], 'ltr');

    expect(names(ordered)).toEqual(['first', 'second']);
  });

  it('leaves the captures it was given untouched', () => {
    const given = [at('later', 7, 0, 0), at('earlier', 3, 0, 0)];
    inBookOrder(given, 'ltr');

    expect(names(given)).toEqual(['later', 'earlier']);
  });
});
