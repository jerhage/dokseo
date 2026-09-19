import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { pairPages, groupContaining } from './page-pairing';

describe('pairPages', () => {
  it('gives one group per image when the pairing is single', () => {
    expect(pairPages(4, 'single')).toEqual([[0], [1], [2], [3]]);
  });

  it('pairs from image zero when the pairing is double', () => {
    expect(pairPages(6, 'double')).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('leaves the last image alone when a doubled count is odd', () => {
    const groups = pairPages(5, 'double');

    expect(groups).toHaveLength(3);
    expect(at(groups, 2)).toEqual([4]);
  });

  it('shows the cover alone and pairs the rest after it', () => {
    expect(pairPages(7, 'double-after-cover')).toEqual([[0], [1, 2], [3, 4], [5, 6]]);
  });

  it('leaves the last image alone when the images after the cover are odd', () => {
    const groups = pairPages(6, 'double-after-cover');

    expect(groups).toEqual([[0], [1, 2], [3, 4], [5]]);
    expect(at(groups, 3)).toEqual([5]);
  });

  it('returns nothing for a count of zero', () => {
    expect(pairPages(0, 'single')).toEqual([]);
    expect(pairPages(0, 'double')).toEqual([]);
    expect(pairPages(0, 'double-after-cover')).toEqual([]);
  });

  it('returns one group of one for a count of one, whatever the pairing', () => {
    expect(pairPages(1, 'single')).toEqual([[0]]);
    expect(pairPages(1, 'double')).toEqual([[0]]);
    expect(pairPages(1, 'double-after-cover')).toEqual([[0]]);
  });

  it('returns nothing for a negative count', () => {
    expect(pairPages(-1, 'double')).toEqual([]);
    expect(pairPages(-8, 'double-after-cover')).toEqual([]);
  });

  it('returns nothing for a count that is not a whole number', () => {
    expect(pairPages(3.5, 'double')).toEqual([]);
    expect(pairPages(Number.NaN, 'single')).toEqual([]);
    expect(pairPages(Number.POSITIVE_INFINITY, 'double-after-cover')).toEqual([]);
  });

  it('orders the indices inside a group ascending', () => {
    expect(at(pairPages(4, 'double'), 1)).toEqual([2, 3]);
  });
});

describe('groupContaining', () => {
  it('finds the group holding an image that shares a pair', () => {
    const groups = pairPages(6, 'double');

    expect(groupContaining(groups, imageIndex(3))).toBe(1);
    expect(groupContaining(groups, imageIndex(2))).toBe(1);
  });

  it('finds the group holding an image that stands alone', () => {
    const groups = pairPages(6, 'double-after-cover');

    expect(groupContaining(groups, imageIndex(0))).toBe(0);
    expect(groupContaining(groups, imageIndex(5))).toBe(3);
  });

  it('reports -1 for an index past the end', () => {
    const groups = pairPages(4, 'double');

    expect(groupContaining(groups, imageIndex(4))).toBe(-1);
    expect(groupContaining([], imageIndex(0))).toBe(-1);
  });
});
