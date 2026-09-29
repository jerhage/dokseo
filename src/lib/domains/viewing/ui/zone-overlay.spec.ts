import { describe, expect, it } from 'vitest';
import { SIDE_ZONE_SHARE } from '$lib/shared/page-turn';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { touchAction } from './touch-action';
import { zoneLabels } from './zone-overlay';

const WIDTH = 390;

function labels(direction: ReadingDirection): readonly string[] {
  return zoneLabels(direction).map((zone) => zone.label);
}

function tapTurn(x: number, direction: ReadingDirection) {
  return touchAction(
    { kind: 'tap', x, y: 400 },
    {
      chromeShown: false,
      turns: 'tap-zones',
      direction,
      frame: { left: 0, width: WIDTH },
      viewportWidth: WIDTH,
      reach: null,
    },
  );
}

describe('zoneLabels', () => {
  it('names the zones Previous, Menu, Next from left to right in a left-to-right book', () => {
    expect(labels('ltr')).toEqual(['Previous', 'Menu', 'Next']);
  });

  it('mirrors the side labels in a right-to-left book', () => {
    expect(labels('rtl')).toEqual(['Next', 'Menu', 'Previous']);
  });

  it('orders the zones left, centre, right', () => {
    expect(zoneLabels('rtl').map((zone) => zone.zone)).toEqual(['left', 'centre', 'right']);
  });

  it('agrees with the turn a tap in each side zone makes, in both directions', () => {
    const left = WIDTH * SIDE_ZONE_SHARE * 0.5;
    const right = WIDTH - left;
    const named = { decrement: 'Previous', increment: 'Next' } as const;

    for (const direction of ['ltr', 'rtl'] as const) {
      const [first, , last] = labels(direction);
      const leftTurn = tapTurn(left, direction);
      const rightTurn = tapTurn(right, direction);
      if (leftTurn.kind !== 'turn' || rightTurn.kind !== 'turn') throw new Error('no turn');

      expect(named[leftTurn.move]).toBe(first);
      expect(named[rightTurn.move]).toBe(last);
    }
  });

  it('agrees that a centre tap brings up the menu', () => {
    expect(tapTurn(WIDTH / 2, 'ltr')).toEqual({ kind: 'toggle-chrome' });
  });
});
