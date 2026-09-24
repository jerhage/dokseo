import { describe, expect, it } from 'vitest';
import { paginationWindow } from './pagination-window';
import type { PageSlot } from './pagination-window';

function shown(slots: readonly PageSlot[]): string {
  return slots.map((slot) => (slot.kind === 'page' ? String(slot.page) : '…')).join(' ');
}

describe('paginationWindow', () => {
  it('lists nothing when there are no pages', () => {
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  it('lists every page when they all fit', () => {
    expect(shown(paginationWindow(4, 7))).toBe('1 2 3 4 5 6 7');
  });

  it('closes the gap before the last page while the current page is near the start', () => {
    expect(shown(paginationWindow(1, 12))).toBe('1 2 3 4 5 … 12');
  });

  it('opens the gap after the first page while the current page is near the end', () => {
    expect(shown(paginationWindow(12, 12))).toBe('1 … 8 9 10 11 12');
  });

  it('surrounds a middle page with its siblings and a gap on each side', () => {
    expect(shown(paginationWindow(6, 12))).toBe('1 … 5 6 7 … 12');
  });

  it('keeps the same number of slots wherever the current page sits', () => {
    const lengths = new Set(
      Array.from({ length: 12 }, (_, index) => paginationWindow(index + 1, 12).length),
    );

    expect([...lengths]).toEqual([7]);
  });

  it('widens the window by the siblings it is asked for', () => {
    expect(shown(paginationWindow(10, 20, 2))).toBe('1 … 8 9 10 11 12 … 20');
  });

  it('rounds a fractional current page to the nearest whole one', () => {
    expect(shown(paginationWindow(5.6, 12))).toBe('1 … 5 6 7 … 12');
  });

  it('treats a current page outside the range as its nearest end', () => {
    expect([shown(paginationWindow(-3, 12)), shown(paginationWindow(40, 12))]).toEqual([
      '1 2 3 4 5 … 12',
      '1 … 8 9 10 11 12',
    ]);
  });

  it('keys each gap by the page before it, so two gaps never share a key', () => {
    const gaps = paginationWindow(6, 12).filter((slot) => slot.kind === 'gap');

    expect(gaps).toEqual([
      { kind: 'gap', after: 1 },
      { kind: 'gap', after: 7 },
    ]);
  });
});
