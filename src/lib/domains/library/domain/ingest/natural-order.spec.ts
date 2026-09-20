import { describe, expect, it } from 'vitest';
import { at } from '$lib/shared/testing/at';
import { compareNatural } from './natural-order';

describe('compareNatural', () => {
  it('orders a shorter number before a longer one', () => {
    expect(compareNatural('page2', 'page10')).toBeLessThan(0);
    expect(compareNatural('page10', 'page2')).toBeGreaterThan(0);
  });

  it('sorts a run of entry names the way a reader expects', () => {
    const names = ['page10', 'page2', 'page1', 'page20', 'page3'];
    expect(names.toSorted(compareNatural)).toEqual(['page1', 'page2', 'page3', 'page10', 'page20']);
  });

  it('orders case-insensitively but never calls two distinct names equal', () => {
    expect(compareNatural('Page2', 'page10')).toBeLessThan(0);
    expect(compareNatural('PAGE', 'page')).toBeLessThan(0);
    expect(compareNatural('page', 'PAGE')).toBeGreaterThan(0);
  });

  it('ignores leading zeros in a number run but still breaks the tie', () => {
    expect(compareNatural('page02', 'page2')).toBeLessThan(0);
    expect(compareNatural('page2', 'page02')).toBeGreaterThan(0);
    expect(compareNatural('page002', 'page10')).toBeLessThan(0);
    expect(['0010.jpg', '009.jpg', '08.jpg'].toSorted(compareNatural)).toEqual([
      '08.jpg',
      '009.jpg',
      '0010.jpg',
    ]);
  });

  it('compares pure text alphabetically', () => {
    expect(compareNatural('alpha', 'beta')).toBeLessThan(0);
    expect(compareNatural('beta', 'alpha')).toBeGreaterThan(0);
  });

  it('orders a name with no digits against one that has them', () => {
    expect(compareNatural('cover', 'page1')).toBeLessThan(0);
    expect(compareNatural('page', 'page1')).toBeLessThan(0);
  });

  it('treats identical names as equal', () => {
    expect(compareNatural('page009', 'page009')).toBe(0);
  });

  it('orders every distinct name, so a sort never depends on archive entry order', () => {
    const names = ['a.jpg', 'A.jpg', 'page2.jpg', 'page02.jpg'];
    const forward = names.toSorted(compareNatural);
    const reversed = names.toReversed().toSorted(compareNatural);
    expect(forward).toEqual(reversed);
    const adjacent = forward.slice(1).map((name, i) => compareNatural(at(forward, i), name));
    expect(adjacent.every((c) => c !== 0)).toBe(true);
  });

  it('places an empty name first', () => {
    expect(compareNatural('', 'a')).toBeLessThan(0);
    expect(compareNatural('a', '')).toBeGreaterThan(0);
    expect(compareNatural('', '')).toBe(0);
  });
});
