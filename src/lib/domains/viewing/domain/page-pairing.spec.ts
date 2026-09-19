import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import type { Size } from '$lib/shared/geometry';
import { pairPages, groupContaining } from './page-pairing';

const portrait: Size = { width: 800, height: 1200 };
const wide: Size = { width: 2400, height: 1200 };
const square: Size = { width: 1000, height: 1000 };

function portraits(count: number): readonly Size[] {
  return Array.from({ length: count }, () => portrait);
}

describe('pairPages', () => {
  it('gives one group per image when the pairing is single', () => {
    expect(pairPages(portraits(4), 'single')).toEqual([[0], [1], [2], [3]]);
  });

  it('pairs from image zero when the pairing is double', () => {
    expect(pairPages(portraits(6), 'double')).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('leaves the last image alone when a doubled run is odd', () => {
    const groups = pairPages(portraits(5), 'double');

    expect(groups).toHaveLength(3);
    expect(at(groups, 2)).toEqual([4]);
  });

  it('shows the cover alone and pairs the rest after it', () => {
    expect(pairPages(portraits(7), 'double-after-cover')).toEqual([[0], [1, 2], [3, 4], [5, 6]]);
  });

  it('leaves the last image alone when the images after the cover are odd', () => {
    const groups = pairPages(portraits(6), 'double-after-cover');

    expect(groups).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(at(groups, 3)).toEqual([5]);
  });

  it('returns nothing for an empty array of sizes', () => {
    expect(pairPages([], 'single')).toEqual([]);
    expect(pairPages([], 'double')).toEqual([]);
    expect(pairPages([], 'double-after-cover')).toEqual([]);
  });

  it('returns one group of one for a lone image, whatever the pairing', () => {
    expect(pairPages(portraits(1), 'single')).toEqual([[0]]);
    expect(pairPages(portraits(1), 'double')).toEqual([[0]]);
    expect(pairPages(portraits(1), 'double-after-cover')).toEqual([[0]]);
  });

  it('orders the indices inside a group ascending', () => {
    expect(at(pairPages(portraits(4), 'double'), 1)).toEqual([2, 3]);
  });

  it('shows a wide image alone when the pairing is double', () => {
    expect(pairPages([portrait, portrait, wide, portrait, portrait], 'double')).toEqual([
      [0, 1],
      [2],
      [3, 4],
    ]);
  });

  it('shows a wide image alone when the pairing is double-after-cover', () => {
    expect(
      pairPages([portrait, portrait, portrait, wide, portrait, portrait], 'double-after-cover'),
    ).toEqual([[0], [1, 2], [3], [4, 5]]);
  });

  it('leaves the portrait before a wide image alone rather than pairing them', () => {
    expect(pairPages([portrait, wide, portrait], 'double')).toEqual([[0], [1], [2]]);
  });

  it('resumes pairing after a wide image', () => {
    expect(pairPages([wide, portrait, portrait], 'double')).toEqual([[0], [1, 2]]);
  });

  it('shows a wide cover alone like any other cover', () => {
    expect(pairPages([wide, portrait, portrait], 'double-after-cover')).toEqual([[0], [1, 2]]);
  });

  it('gives a group of one to each of two wide images in a row', () => {
    expect(pairPages([wide, wide], 'double')).toEqual([[0], [1]]);
    expect(pairPages([portrait, wide, wide, portrait, portrait], 'double')).toEqual([
      [0],
      [1],
      [2],
      [3, 4],
    ]);
  });

  it('treats an unmeasured image as portrait', () => {
    expect(pairPages([null, null, null, null], 'double')).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(pairPages([null, portrait, null], 'double-after-cover')).toEqual([[0], [1, 2]]);
  });

  it('treats a square image as portrait', () => {
    expect(pairPages([square, square], 'double')).toEqual([[0, 1]]);
    expect(pairPages([square, portrait], 'double')).toEqual([[0, 1]]);
  });

  it('treats a zero, negative or non-finite dimension as portrait', () => {
    const suspect: readonly Size[] = [
      { width: 0, height: 1200 },
      { width: 2400, height: 0 },
      { width: -2400, height: 1200 },
      { width: 2400, height: -1200 },
      { width: Number.NaN, height: 1200 },
      { width: Number.POSITIVE_INFINITY, height: 1200 },
      { width: 2400, height: Number.NaN },
    ];

    for (const size of suspect) {
      expect(pairPages([size, portrait], 'double')).toEqual([[0, 1]]);
    }
  });

  it('ignores image shape when the pairing is single', () => {
    expect(pairPages([wide, wide, portrait, null], 'single')).toEqual([[0], [1], [2], [3]]);
  });
});

describe('groupContaining', () => {
  it('finds the group holding an image that shares a pair', () => {
    const groups = pairPages(portraits(6), 'double');

    expect(groupContaining(groups, imageIndex(3))).toBe(1);
    expect(groupContaining(groups, imageIndex(2))).toBe(1);
  });

  it('finds the group holding an image that stands alone', () => {
    const groups = pairPages(portraits(6), 'double-after-cover');

    expect(groupContaining(groups, imageIndex(0))).toBe(0);
    expect(groupContaining(groups, imageIndex(5))).toBe(3);
  });

  it('reports -1 for an index past the end', () => {
    const groups = pairPages(portraits(4), 'double');

    expect(groupContaining(groups, imageIndex(4))).toBe(-1);
    expect(groupContaining([], imageIndex(0))).toBe(-1);
  });
});
