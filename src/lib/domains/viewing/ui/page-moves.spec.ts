import { describe, expect, it } from 'vitest';
import { swipeTurn, tapZone } from '$lib/shared/page-turn';
import type { FrameSpan, TouchTurns, TurnPoint, TurnSide } from '$lib/shared/page-turn';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { moveOrder, moveTowards } from './page-moves';
import type { PageMove } from './page-moves';

const PHONE: FrameSpan = { left: 0, width: 390 };

function at(x: number): TurnPoint {
  return { x, y: 400 };
}

type Gesture =
  | { readonly kind: 'swipe'; readonly from: number; readonly to: number }
  | { readonly kind: 'tap'; readonly x: number };

function sideOf(gesture: Gesture, turns: TouchTurns): TurnSide | null {
  if (gesture.kind === 'swipe') {
    return swipeTurn(at(gesture.from), at(gesture.to), 300, PHONE, 390, turns);
  }
  const zone = tapZone(gesture.x, 390, turns);
  return zone === 'centre' ? null : zone;
}

describe('moveOrder', () => {
  it('puts the incrementing move first in a right-to-left book, because advancing moves leftward', () => {
    expect(moveOrder('paged', 'rtl')).toEqual(['increment', 'decrement']);
  });

  it('puts the decrementing move first in a left-to-right book', () => {
    expect(moveOrder('paged', 'ltr')).toEqual(['decrement', 'increment']);
  });

  it.each(['ltr', 'rtl'] as const)(
    'puts the decrementing move first in a %s strip, because it reads downward',
    (direction) => {
      expect(moveOrder('continuous', direction)).toEqual(['decrement', 'increment']);
    },
  );
});

describe('moveTowards', () => {
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

  it.each<{
    readonly gesture: Gesture;
    readonly turns: TouchTurns;
    readonly direction: ReadingDirection;
    readonly side: TurnSide | null;
    readonly move: PageMove | null;
  }>([
    {
      gesture: { kind: 'swipe', from: 120, to: 260 },
      turns: 'tap-zones',
      direction: 'rtl',
      side: 'left',
      move: 'increment',
    },
    {
      gesture: { kind: 'swipe', from: 120, to: 260 },
      turns: 'swipe-only',
      direction: 'rtl',
      side: 'left',
      move: 'increment',
    },
    {
      gesture: { kind: 'swipe', from: 260, to: 120 },
      turns: 'tap-zones',
      direction: 'ltr',
      side: 'right',
      move: 'increment',
    },
    {
      gesture: { kind: 'swipe', from: 260, to: 120 },
      turns: 'swipe-only',
      direction: 'ltr',
      side: 'right',
      move: 'increment',
    },
    {
      gesture: { kind: 'tap', x: 40 },
      turns: 'tap-zones',
      direction: 'rtl',
      side: 'left',
      move: 'increment',
    },
    {
      gesture: { kind: 'tap', x: 40 },
      turns: 'swipe-only',
      direction: 'rtl',
      side: null,
      move: null,
    },
  ])(
    'answers $move for a $gesture.kind towards the $side in a $direction book under $turns',
    ({ gesture, turns, direction, side, move }) => {
      const turned = sideOf(gesture, turns);

      expect(turned).toBe(side);
      expect(turned === null ? null : moveTowards(turned, 'paged', direction)).toBe(move);
    },
  );
});
