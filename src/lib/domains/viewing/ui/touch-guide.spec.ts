import { describe, expect, it } from 'vitest';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { SwipeFinger, TouchTurns } from '$lib/shared/page-turn';
import { touchAction } from './touch-action';
import {
  STRIP_GUIDE,
  STRIP_GUIDE_KIND,
  forwardSwipe,
  offersTouchGuide,
  pagedGuide,
} from './touch-guide';
import { zoneLabels } from './zone-overlay';

const WIDTH = 390;

const FINGER_TRAVEL: Readonly<Record<SwipeFinger, readonly [number, number]>> = {
  left: [300, 150],
  right: [100, 250],
};

function swipeMove(finger: SwipeFinger, direction: ReadingDirection, turns: TouchTurns) {
  const [from, to] = FINGER_TRAVEL[finger];
  return touchAction(
    { kind: 'swipe', start: { x: from, y: 400 }, end: { x: to, y: 400 }, elapsed: 150 },
    {
      chromeShown: false,
      turns,
      direction,
      frame: { left: 0, width: WIDTH },
      viewportWidth: WIDTH,
      reach: null,
    },
  );
}

describe('offersTouchGuide', () => {
  it.each([
    { input: 'touch', offered: true },
    { input: 'pointer', offered: false },
  ] as const)('offers the guide to a $input reader: $offered', ({ input, offered }) => {
    expect(offersTouchGuide(input)).toBe(offered);
  });
});

describe('forwardSwipe', () => {
  it('names the swipe that really turns forward, in both directions and both turn modes', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      for (const turns of ['tap-zones', 'swipe-only'] as const) {
        expect(swipeMove(forwardSwipe(direction), direction, turns)).toEqual({
          kind: 'turn',
          move: 'increment',
        });
      }
    }
  });
});

describe('pagedGuide', () => {
  it('teaches only the swipe in swipe only, as the swipe-left kind in a left-to-right book', () => {
    expect(pagedGuide('swipe-only', 'ltr')).toEqual({
      kind: 'swipe-left',
      zones: [],
      swipe: { kind: 'sideways', forward: 'left' },
    });
  });

  it('keys swipe only in a right-to-left book as the swipe-right kind', () => {
    expect(pagedGuide('swipe-only', 'rtl').kind).toBe('swipe-right');
  });

  it('teaches the zones and the swipe in tap zones, as the tap-zones kind in either direction', () => {
    expect(pagedGuide('tap-zones', 'rtl')).toEqual({
      kind: 'tap-zones',
      zones: zoneLabels('rtl'),
      swipe: { kind: 'sideways', forward: 'right' },
    });
    expect(pagedGuide('tap-zones', 'ltr').kind).toBe('tap-zones');
  });
});

describe('STRIP_GUIDE', () => {
  it('teaches a strip to scroll up or down', () => {
    expect(STRIP_GUIDE).toEqual({ kind: 'vertical-scroll' });
  });

  it('keys the strip guide as the strip-scroll kind', () => {
    expect(STRIP_GUIDE_KIND).toBe('strip-scroll');
  });
});
