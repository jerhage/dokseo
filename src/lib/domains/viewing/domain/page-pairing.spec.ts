import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { Size } from '$lib/shared/geometry';
import { pairPages, groupContaining } from './page-pairing';

const portrait: Size = { width: 800, height: 1200 };
const wide: Size = { width: 2400, height: 1200 };
const square: Size = { width: 1000, height: 1000 };

function portraits(count: number): readonly Size[] {
  return Array.from({ length: count }, () => portrait);
}

describe('pairPages', () => {
  it.each([
    { sizes: portraits(4), groups: [[0], [1], [2], [3]] },
    { sizes: [wide, wide, portrait, null], groups: [[0], [1], [2], [3]] },
  ])(
    'gives one group per image when the pairing is single, whatever its shape',
    ({ sizes, groups }) => {
      expect(pairPages(sizes, 'single')).toEqual(groups);
    },
  );

  it.each([
    {
      sizes: portraits(6),
      groups: [
        [0, 1],
        [2, 3],
        [4, 5],
      ],
    },
    {
      sizes: portraits(4),
      groups: [
        [0, 1],
        [2, 3],
      ],
    },
    { sizes: portraits(5), groups: [[0, 1], [2, 3], [4]] },
  ])(
    'pairs from image zero when the pairing is double, leaving an odd last image alone',
    ({ sizes, groups }) => {
      expect(pairPages(sizes, 'double')).toEqual(groups);
    },
  );

  it.each([
    { sizes: portraits(7), groups: [[0], [1, 2], [3, 4], [5, 6]] },
    { sizes: portraits(6), groups: [[0], [1, 2], [3, 4], [5]] },
  ])(
    'shows the cover alone and pairs the rest after it, leaving an odd last image alone',
    ({ sizes, groups }) => {
      expect(pairPages(sizes, 'double-after-cover')).toEqual(groups);
    },
  );

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

  it.each([
    {
      sizes: [portrait, portrait, wide, portrait, portrait],
      pairing: 'double',
      groups: [[0, 1], [2], [3, 4]],
    },
    {
      sizes: [portrait, portrait, portrait, wide, portrait, portrait],
      pairing: 'double-after-cover',
      groups: [[0], [1, 2], [3], [4, 5]],
    },
    { sizes: [wide, portrait, portrait], pairing: 'double', groups: [[0], [1, 2]] },
    { sizes: [wide, portrait, portrait], pairing: 'double-after-cover', groups: [[0], [1, 2]] },
    { sizes: [wide, wide], pairing: 'double', groups: [[0], [1]] },
    {
      sizes: [portrait, wide, wide, portrait, portrait],
      pairing: 'double',
      groups: [[0], [1], [2], [3, 4]],
    },
  ] as const)(
    'shows a wide image alone and resumes pairing after it, $pairing',
    ({ sizes, pairing, groups }) => {
      expect(pairPages(sizes, pairing)).toEqual(groups);
    },
  );

  it('leaves the portrait before a wide image alone rather than pairing them', () => {
    expect(pairPages([portrait, wide, portrait], 'double')).toEqual([[0], [1], [2]]);
  });

  it.each([
    {
      sizes: [null, null, null, null],
      pairing: 'double',
      groups: [
        [0, 1],
        [2, 3],
      ],
    },
    { sizes: [null, portrait, null], pairing: 'double-after-cover', groups: [[0], [1, 2]] },
    { sizes: [square, square], pairing: 'double', groups: [[0, 1]] },
    { sizes: [square, portrait], pairing: 'double', groups: [[0, 1]] },
    { sizes: [{ width: 0, height: 1200 }, portrait], pairing: 'double', groups: [[0, 1]] },
    { sizes: [{ width: 2400, height: 0 }, portrait], pairing: 'double', groups: [[0, 1]] },
    { sizes: [{ width: -2400, height: 1200 }, portrait], pairing: 'double', groups: [[0, 1]] },
    { sizes: [{ width: 2400, height: -1200 }, portrait], pairing: 'double', groups: [[0, 1]] },
    { sizes: [{ width: Number.NaN, height: 1200 }, portrait], pairing: 'double', groups: [[0, 1]] },
    {
      sizes: [{ width: Number.POSITIVE_INFINITY, height: 1200 }, portrait],
      pairing: 'double',
      groups: [[0, 1]],
    },
    { sizes: [{ width: 2400, height: Number.NaN }, portrait], pairing: 'double', groups: [[0, 1]] },
  ] as const)(
    'treats an unmeasured, square, zero, negative or non-finite image as portrait',
    ({ sizes, pairing, groups }) => {
      expect(pairPages(sizes, pairing)).toEqual(groups);
    },
  );
});

describe('groupContaining', () => {
  it.each([
    { pairing: 'double', index: 3, group: 1 },
    { pairing: 'double', index: 2, group: 1 },
    { pairing: 'double-after-cover', index: 0, group: 0 },
    { pairing: 'double-after-cover', index: 5, group: 3 },
  ] as const)(
    'finds the group holding image $index under $pairing, paired or alone',
    ({ pairing, index, group }) => {
      expect(groupContaining(pairPages(portraits(6), pairing), imageIndex(index))).toBe(group);
    },
  );

  it('reports -1 for an index past the end', () => {
    const groups = pairPages(portraits(4), 'double');

    expect(groupContaining(groups, imageIndex(4))).toBe(-1);
    expect(groupContaining([], imageIndex(0))).toBe(-1);
  });
});
