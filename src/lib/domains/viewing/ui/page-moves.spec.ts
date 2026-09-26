import { describe, expect, it } from 'vitest';
import { swipeTurn, tapZone } from '$lib/shared/page-turn';
import type { FrameSpan, TapZone, TurnPoint, TurnSide } from '$lib/shared/page-turn';
import { moveOrder, moveTowards } from './page-moves';

const PHONE: FrameSpan = { left: 0, width: 390 };

function at(x: number): TurnPoint {
  return { x, y: 400 };
}

function sideOf(zone: TapZone): TurnSide {
  if (zone === 'centre') throw new Error('expected a side zone');
  return zone;
}

describe('moveOrder', () => {
  it('puts the incrementing move first in a right-to-left book, because advancing moves leftward', () => {
    expect(moveOrder('paged', 'rtl')).toEqual(['increment', 'decrement']);
  });

  it('puts the decrementing move first in a left-to-right book', () => {
    expect(moveOrder('paged', 'ltr')).toEqual(['decrement', 'increment']);
  });

  it('turns a right-to-left book the other way round from a left-to-right one', () => {
    expect(moveOrder('paged', 'rtl')).toEqual(moveOrder('paged', 'ltr').toReversed());
  });

  it('puts the decrementing move first in a strip, because it reads downward', () => {
    expect(moveOrder('continuous', 'ltr')).toEqual(['decrement', 'increment']);
  });

  it('orders a strip one way whatever direction it carries', () => {
    expect(moveOrder('continuous', 'rtl')).toEqual(moveOrder('continuous', 'ltr'));
  });

  it('offers each move exactly once', () => {
    expect(new Set(moveOrder('paged', 'rtl')).size).toBe(2);
  });
});

describe('moveTowards', () => {
  it('advances a right-to-left book from the left side, exactly as the footer does', () => {
    expect(moveTowards('left', 'paged', 'rtl')).toBe('increment');
    expect(moveTowards('right', 'paged', 'rtl')).toBe('decrement');
  });

  it('advances a left-to-right book from the right side', () => {
    expect(moveTowards('left', 'paged', 'ltr')).toBe('decrement');
    expect(moveTowards('right', 'paged', 'ltr')).toBe('increment');
  });

  it('matches the footer slot on each side for every layout and direction', () => {
    for (const layout of ['paged', 'continuous'] as const) {
      for (const direction of ['ltr', 'rtl'] as const) {
        expect([
          moveTowards('left', layout, direction),
          moveTowards('right', layout, direction),
        ]).toEqual(moveOrder(layout, direction));
      }
    }
  });

  it('advances a manga when the finger swipes rightward, in both variants', () => {
    for (const turns of ['tap-zones', 'swipe-only'] as const) {
      const side = swipeTurn(at(120), at(260), 300, PHONE, 390, turns);

      expect(side).toBe('left');
      if (side !== null) expect(moveTowards(side, 'paged', 'rtl')).toBe('increment');
    }
  });

  it('advances a left-to-right book when the finger swipes leftward, in both variants', () => {
    for (const turns of ['tap-zones', 'swipe-only'] as const) {
      const side = swipeTurn(at(260), at(120), 300, PHONE, 390, turns);

      expect(side).toBe('right');
      if (side !== null) expect(moveTowards(side, 'paged', 'ltr')).toBe('increment');
    }
  });

  it('advances a manga on a tap in the left zone, and a swipe-only tap turns nothing', () => {
    expect(moveTowards(sideOf(tapZone(40, 390, 'tap-zones')), 'paged', 'rtl')).toBe('increment');
    expect(tapZone(40, 390, 'swipe-only')).toBe('centre');
  });
});
