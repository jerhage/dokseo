import { describe, expect, it } from 'vitest';
import {
  EDGE_GUTTER_PX,
  SWIPE_MIN_PX,
  swipeMayStart,
  swipeTurn,
  swipedSide,
  tapZone,
  towards,
} from './page-turn';
import type { FrameSpan, TouchTurns, TurnPoint } from './page-turn';

const PHONE_WIDTH = 390;

const WHOLE_SCREEN: FrameSpan = { left: 0, width: PHONE_WIDTH };

const SLOW_MS = 1000;

const BOTH: readonly TouchTurns[] = ['tap-zones', 'swipe-only'];

function at(x: number, y = 400): TurnPoint {
  return { x, y };
}

describe('tapZone', () => {
  it('splits the frame thirty, forty, thirty in the tap-zones variant', () => {
    expect(tapZone(0, PHONE_WIDTH, 'tap-zones')).toBe('left');
    expect(tapZone(116, PHONE_WIDTH, 'tap-zones')).toBe('left');
    expect(tapZone(118, PHONE_WIDTH, 'tap-zones')).toBe('centre');
    expect(tapZone(195, PHONE_WIDTH, 'tap-zones')).toBe('centre');
    expect(tapZone(272, PHONE_WIDTH, 'tap-zones')).toBe('centre');
    expect(tapZone(274, PHONE_WIDTH, 'tap-zones')).toBe('right');
    expect(tapZone(PHONE_WIDTH, PHONE_WIDTH, 'tap-zones')).toBe('right');
  });

  it('answers the centre everywhere in the swipe-only variant, so a tap never turns', () => {
    for (const x of [0, 10, 116, 195, 274, 380, PHONE_WIDTH]) {
      expect(tapZone(x, PHONE_WIDTH, 'swipe-only')).toBe('centre');
    }
  });

  it('answers the centre for a frame it cannot divide', () => {
    expect(tapZone(10, 0, 'tap-zones')).toBe('centre');
    expect(tapZone(10, -390, 'tap-zones')).toBe('centre');
    expect(tapZone(10, Number.NaN, 'tap-zones')).toBe('centre');
    expect(tapZone(Number.NaN, PHONE_WIDTH, 'tap-zones')).toBe('centre');
  });
});

describe('swipedSide', () => {
  it.each([
    ['left', 'right'],
    ['right', 'left'],
  ] as const)('reports for a finger moving %s the %s side', (moving, side) => {
    expect(swipedSide(moving)).toBe(side);
  });
});

describe('swipeTurn', () => {
  it.each([
    ['right', 'leftward', 300, 200],
    ['left', 'rightward', 100, 200],
  ] as const)(
    'turns towards the %s when the finger travels %s, in both variants',
    (side, _travel, from, to) => {
      for (const turns of BOTH) {
        expect(swipeTurn(at(from), at(to), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, turns)).toBe(side);
      }
    },
  );

  it('turns on distance alone once the finger has travelled the minimum', () => {
    expect(
      swipeTurn(at(200), at(200 - SWIPE_MIN_PX), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones'),
    ).toBe('right');
    expect(
      swipeTurn(
        at(200),
        at(200 - SWIPE_MIN_PX + 1),
        SLOW_MS,
        WHOLE_SCREEN,
        PHONE_WIDTH,
        'tap-zones',
      ),
    ).toBeNull();
  });

  it('turns on a short quick flick', () => {
    expect(swipeTurn(at(200), at(170), 60, WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only')).toBe('right');
    expect(swipeTurn(at(200), at(170), 200, WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only')).toBeNull();
  });

  it('refuses a quick flick no longer than the touch slop, which is a tap', () => {
    expect(swipeTurn(at(200), at(190), 5, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones')).toBeNull();
  });

  it('refuses a flick with no measurable duration unless it travelled the minimum', () => {
    expect(swipeTurn(at(200), at(170), 0, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones')).toBeNull();
    expect(swipeTurn(at(200), at(140), 0, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones')).toBe('right');
  });

  it('refuses a swipe that is not mostly horizontal', () => {
    expect(
      swipeTurn(at(200, 400), at(110, 340), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones'),
    ).toBeNull();
    expect(
      swipeTurn(at(200, 400), at(110, 341), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones'),
    ).toBe('right');
    expect(
      swipeTurn(at(200, 600), at(200, 100), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only'),
    ).toBeNull();
  });

  it.each([
    [EDGE_GUTTER_PX - 1, null],
    [PHONE_WIDTH - EDGE_GUTTER_PX + 1, null],
    [EDGE_GUTTER_PX, 'left'],
    [PHONE_WIDTH - EDGE_GUTTER_PX, 'right'],
  ] as const)(
    'leaves a swipe from x %d to the browser only from inside the edge gutter in the swipe-only variant',
    (x, turned) => {
      expect(swipeTurn(at(x), at(200), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only')).toBe(
        turned,
      );
    },
  );

  it('measures the gutter from the screen, not from the frame', () => {
    const inset: FrameSpan = { left: 40, width: 310 };

    expect(swipeTurn(at(45), at(200), SLOW_MS, inset, PHONE_WIDTH, 'swipe-only')).toBe('left');
  });

  it('keeps a swipe from the screen edge in the tap-zones variant', () => {
    expect(swipeTurn(at(4), at(200), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones')).toBe('left');
  });

  it('refuses a swipe that starts off the frame', () => {
    const inset: FrameSpan = { left: 40, width: 310 };

    expect(swipeTurn(at(30), at(200), SLOW_MS, inset, PHONE_WIDTH, 'tap-zones')).toBeNull();
    expect(swipeTurn(at(360), at(200), SLOW_MS, inset, PHONE_WIDTH, 'tap-zones')).toBeNull();
  });

  it('refuses a swipe it cannot measure', () => {
    expect(
      swipeTurn(at(Number.NaN), at(200), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones'),
    ).toBeNull();
    expect(
      swipeTurn(at(300), at(200, Number.NaN), SLOW_MS, WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones'),
    ).toBeNull();
    expect(
      swipeTurn(at(300), at(200), SLOW_MS, { left: 0, width: 0 }, PHONE_WIDTH, 'tap-zones'),
    ).toBeNull();
  });
});

describe('swipeMayStart', () => {
  it('lets a swipe start anywhere on the frame in the tap-zones variant', () => {
    for (const x of [0, EDGE_GUTTER_PX - 1, 195, PHONE_WIDTH]) {
      expect(swipeMayStart(at(x), WHOLE_SCREEN, PHONE_WIDTH, 'tap-zones')).toBe(true);
    }
  });

  it('refuses a start in either edge gutter in the swipe-only variant', () => {
    expect(swipeMayStart(at(EDGE_GUTTER_PX - 1), WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only')).toBe(
      false,
    );
    expect(
      swipeMayStart(at(PHONE_WIDTH - EDGE_GUTTER_PX + 1), WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only'),
    ).toBe(false);
    expect(swipeMayStart(at(195), WHOLE_SCREEN, PHONE_WIDTH, 'swipe-only')).toBe(true);
  });

  it('refuses a start off the frame, on a frame with no width, or at no number', () => {
    for (const turns of BOTH) {
      expect(swipeMayStart(at(50), { left: 100, width: 200 }, PHONE_WIDTH, turns)).toBe(false);
      expect(swipeMayStart(at(195), { left: 0, width: 0 }, PHONE_WIDTH, turns)).toBe(false);
      expect(swipeMayStart(at(Number.NaN), WHOLE_SCREEN, PHONE_WIDTH, turns)).toBe(false);
    }
  });
});

describe('towards', () => {
  it('picks the first slot for the left and the second for the right', () => {
    expect(towards('left', ['first', 'second'])).toBe('first');
    expect(towards('right', ['first', 'second'])).toBe('second');
  });
});
