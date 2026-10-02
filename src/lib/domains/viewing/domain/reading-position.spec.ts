import { describe, expect, it } from 'vitest';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { at } from '$lib/shared/testing/at';
import { pairPages } from './page-pairing';
import type { PageGroup } from './page-pairing';
import { groupOf, positionOfGroup, readingPosition } from './reading-position';
import type { ReadingPosition } from './reading-position';

const portrait: Size = { width: 800, height: 1200 };
const wide: Size = { width: 2400, height: 1200 };

function portraits(count: number): readonly Size[] {
  return Array.from({ length: count }, () => portrait);
}

function startOf(groups: readonly PageGroup[], group: number): ReadingPosition {
  const position = positionOfGroup(groups, group);
  if (position === null) throw new Error(`expected a position for group ${group}`);
  return position;
}

describe('readingPosition', () => {
  it('falls back to zero for a non-finite offset', () => {
    expect(readingPosition(imageIndex(3), Number.NaN).offset).toBe(0);
    expect(readingPosition(imageIndex(3), Number.POSITIVE_INFINITY).offset).toBe(0);
    expect(readingPosition(imageIndex(3), Number.NEGATIVE_INFINITY).offset).toBe(0);
  });

  it.each([
    { index: 3, offset: -0.4, clamped: 0 },
    { index: 3, offset: 1.8, clamped: 1 },
    { index: 3, offset: 0.42, clamped: 0.42 },
    { index: 0, offset: 0, clamped: 0 },
    { index: 0, offset: 1, clamped: 1 },
  ])('clamps an offset of $offset to $clamped', ({ index, offset, clamped }) => {
    expect(readingPosition(imageIndex(index), offset)).toEqual({ index, offset: clamped });
  });
});

describe('groupOf', () => {
  it('finds the group holding an image that stands alone', () => {
    const groups = pairPages([portrait, wide, portrait, portrait], 'double');

    expect(groupOf(groups, readingPosition(imageIndex(1), 0))).toBe(1);
  });
});

describe('positionOfGroup', () => {
  it('returns the first image of a group at offset zero', () => {
    const groups = pairPages(portraits(6), 'double-after-cover');

    expect(positionOfGroup(groups, 0)).toEqual({ index: 0, offset: 0 });
    expect(positionOfGroup(groups, 2)).toEqual({ index: 3, offset: 0 });
  });

  it.each([
    { groups: pairPages(portraits(4), 'double'), group: -1 },
    { groups: pairPages(portraits(4), 'double'), group: 2 },
    { groups: [], group: 0 },
  ])('returns null for group $group, before the start or past the end', ({ groups, group }) => {
    expect(positionOfGroup(groups, group)).toBeNull();
  });
});

describe('a stored reading position', () => {
  it('survives the groups being recomputed when a wide image is discovered', () => {
    const before = pairPages(portraits(5), 'double');
    const position: ReadingPosition = startOf(before, 2);

    expect(position).toEqual({ index: 4, offset: 0 });
    expect(groupOf(before, position)).toBe(2);

    const after = pairPages([portrait, wide, portrait, portrait, portrait], 'double');

    expect(after).toEqual([[0], [1], [2, 3], [4]]);
    expect(groupOf(after, position)).toBe(3);
    expect(at(after, groupOf(after, position))).toContain(position.index);
  });
});
