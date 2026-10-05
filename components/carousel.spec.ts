import { describe, expect, it } from 'vitest';
import {
  CAROUSEL_REST,
  SETTLE_FALLBACK_MARGIN_MS,
  carouselAround,
  carouselGap,
  carouselNeighbours,
  carouselOffset,
  carouselShift,
  carouselStep,
  holdsSide,
  revealedSide,
  screenSide,
  settleFallbackMs,
  SETTLES_AT_ONCE,
  swipeRelease,
} from './carousel';
import type { CarouselMotion, CarouselScene } from './carousel';

const WIDTH = 390;

const GAP = 16;

const ACROSS = WIDTH + GAP;

const MIDDLE: CarouselScene = {
  width: WIDTH,
  gap: GAP,
  direction: 'ltr',
  neighbours: { before: true, after: true },
};

const MIRRORED: CarouselScene = { ...MIDDLE, direction: 'rtl' };

const FIRST: CarouselScene = { ...MIDDLE, neighbours: { before: false, after: true } };

const LAST: CarouselScene = { ...MIDDLE, neighbours: { before: true, after: false } };

function following(offset: number): CarouselMotion {
  return { kind: 'follow', offset };
}

function travel(by: number) {
  return { kind: 'follow', travel: by } as const;
}

function release(towards: -1 | 1 | null) {
  return { kind: 'release', towards } as const;
}

describe('screenSide', () => {
  it('keeps every slot where its side says left to right, and mirrors the neighbours right to left', () => {
    expect([
      screenSide(-1, 'ltr'),
      screenSide(0, 'ltr'),
      screenSide(1, 'ltr'),
      screenSide(1, 'rtl'),
      screenSide(-1, 'rtl'),
    ]).toEqual([-1, 0, 1, -1, 1]);
    expect(Object.is(screenSide(0, 'rtl'), 0)).toBe(true);
  });
});

describe('revealedSide', () => {
  it('reveals the slot after for a drag to the left and the slot before for a drag to the right, mirrored right to left', () => {
    expect([
      revealedSide(-50, 'ltr'),
      revealedSide(50, 'ltr'),
      revealedSide(-50, 'rtl'),
      revealedSide(50, 'rtl'),
    ]).toEqual([1, -1, -1, 1]);
  });
});

describe('carouselNeighbours', () => {
  it('reports which sides hold a slide', () => {
    expect(
      carouselNeighbours([
        { key: 'a', beside: 0 },
        { key: 'b', beside: 1 },
      ]),
    ).toEqual({ before: false, after: true });
    expect(holdsSide({ before: false, after: true }, 1)).toBe(true);
    expect(holdsSide({ before: false, after: true }, -1)).toBe(false);
  });
});

describe('carouselAround', () => {
  it('places the slide before, the current slide and the slide after, keyed by their index', () => {
    expect(carouselAround(2, 5)).toEqual([
      { key: 1, beside: -1 },
      { key: 2, beside: 0 },
      { key: 3, beside: 1 },
    ]);
  });

  it('leaves out a side past either end, and everything for an index outside the list', () => {
    expect(carouselAround(0, 5).map((slide) => slide.beside)).toEqual([0, 1]);
    expect(carouselAround(4, 5).map((slide) => slide.beside)).toEqual([-1, 0]);
    expect(carouselAround(0, 0)).toEqual([]);
  });
});

describe('carouselOffset', () => {
  it('follows the finger where a neighbour waits on that side', () => {
    expect(carouselOffset(-120, MIDDLE)).toBe(-120);
    expect(carouselOffset(90, MIDDLE)).toBe(90);
  });

  it('stops once the neighbour has arrived', () => {
    expect(carouselOffset(-900, MIDDLE)).toBe(-ACROSS);
    expect(carouselOffset(900, MIDDLE)).toBe(ACROSS);
  });

  it('resists a drag towards the missing slide before the first one', () => {
    const offset = carouselOffset(200, FIRST);

    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(100);
    expect(carouselOffset(-200, FIRST)).toBe(-200);
  });

  it('resists a drag past the last slide, and never lets the slide leave', () => {
    expect(carouselOffset(-200, LAST)).toBeGreaterThan(-100);
    expect(carouselOffset(-100_000, LAST)).toBeGreaterThan(-WIDTH);
  });

  it('resists on the mirrored side in a right-to-left carousel', () => {
    const atTheEnd: CarouselScene = { ...MIRRORED, neighbours: { before: true, after: false } };

    expect(carouselOffset(200, atTheEnd)).toBeLessThan(100);
    expect(carouselOffset(-200, atTheEnd)).toBe(-200);
  });

  it('stays put for no travel, a travel that is not a number, or a frame with no width', () => {
    expect(carouselOffset(0, MIDDLE)).toBe(0);
    expect(carouselOffset(Number.NaN, MIDDLE)).toBe(0);
    expect(carouselOffset(-120, { ...MIDDLE, width: 0 })).toBe(0);
  });
});

describe('carouselStep', () => {
  it('follows while the caller feeds travel', () => {
    expect(carouselStep(CAROUSEL_REST, travel(-120), MIDDLE)).toEqual(following(-120));
    expect(carouselStep(following(-60), travel(-80), MIDDLE)).toEqual(following(-80));
  });

  it('completes the slide towards the side the release asked for', () => {
    expect(carouselStep(following(-120), release(1), MIDDLE)).toEqual({
      kind: 'settle',
      offset: -ACROSS,
      towards: 1,
    });
    expect(carouselStep(following(120), release(-1), MIDDLE)).toEqual({
      kind: 'settle',
      offset: ACROSS,
      towards: -1,
    });
    expect(carouselStep(following(120), release(1), MIRRORED)).toEqual({
      kind: 'settle',
      offset: ACROSS,
      towards: 1,
    });
  });

  it('lands the neighbour it settles on exactly on the current slot, in either direction', () => {
    for (const scene of [MIDDLE, MIRRORED]) {
      for (const side of [1, -1] as const) {
        const by = screenSide(side, scene.direction) * -120;
        const end = carouselStep(following(by), release(side), scene);

        expect(carouselShift(end) + screenSide(side, scene.direction) * ACROSS).toBe(0);
      }
    }
  });

  it('snaps back when the release settles on nothing', () => {
    expect(carouselStep(following(-30), release(null), MIDDLE)).toEqual({
      kind: 'settle',
      offset: 0,
      towards: null,
    });
  });

  it('snaps back at the first slide even when the release asks for the side before', () => {
    expect(carouselStep(following(40), release(-1), FIRST)).toEqual({
      kind: 'settle',
      offset: 0,
      towards: null,
    });
  });

  it('rests when the finger never moved the slide, so a caller can move instantly', () => {
    expect(carouselStep(following(0), release(1), MIDDLE)).toEqual(CAROUSEL_REST);
    expect(carouselStep(CAROUSEL_REST, release(1), MIDDLE)).toEqual(CAROUSEL_REST);
  });

  it('leaves a settling slide alone until it finishes', () => {
    const settling: CarouselMotion = { kind: 'settle', offset: -ACROSS, towards: 1 };

    expect(carouselStep(settling, travel(-200), MIDDLE)).toBe(settling);
    expect(carouselStep(settling, release(-1), MIDDLE)).toBe(settling);
  });
});

describe('carouselShift', () => {
  it('shifts by the offset while following or settling, and not at rest', () => {
    expect(carouselShift(CAROUSEL_REST)).toBe(0);
    expect(carouselShift(following(-42))).toBe(-42);
    expect(carouselShift({ kind: 'settle', offset: ACROSS, towards: -1 })).toBe(ACROSS);
  });
});

describe('swipeRelease', () => {
  it('settles on the revealed side after a quarter of the width', () => {
    expect(swipeRelease(-100, 1000, WIDTH, 'ltr')).toBe(1);
    expect(swipeRelease(100, 1000, WIDTH, 'ltr')).toBe(-1);
    expect(swipeRelease(100, 1000, WIDTH, 'rtl')).toBe(1);
  });

  it('settles on the revealed side after a short fast flick', () => {
    expect(swipeRelease(-40, 50, WIDTH, 'ltr')).toBe(1);
  });

  it('settles on nothing after a short slow drag, a twitch, or no travel', () => {
    expect(swipeRelease(-40, 1000, WIDTH, 'ltr')).toBeNull();
    expect(swipeRelease(-10, 5, WIDTH, 'ltr')).toBeNull();
    expect(swipeRelease(0, 50, WIDTH, 'ltr')).toBeNull();
    expect(swipeRelease(-200, 50, 0, 'ltr')).toBeNull();
  });
});

describe('carouselGap', () => {
  it('reads the pixels the --carousel-gap token computes to', () => {
    const style = {
      getPropertyValue: (property: string) => (property === '--carousel-gap' ? '16px' : ''),
    };

    expect(carouselGap(style)).toBe(16);
  });
});

describe('settleFallbackMs', () => {
  it('outlasts a transition given in seconds or in milliseconds by the margin', () => {
    expect([
      settleFallbackMs('0.18s'),
      settleFallbackMs('0.14s'),
      settleFallbackMs('40ms'),
    ]).toEqual([180, 140, 40].map((ms) => ms + SETTLE_FALLBACK_MARGIN_MS));
  });

  it('outlasts the longest of several transitions', () => {
    expect(settleFallbackMs('0.1s, 0.3s, 0s')).toBe(300 + SETTLE_FALLBACK_MARGIN_MS);
  });

  it('finishes a settle at once when the transition takes no time', () => {
    expect(settleFallbackMs('0s')).toBe(SETTLES_AT_ONCE);
    expect(settleFallbackMs('0ms, 0s')).toBe(SETTLES_AT_ONCE);
  });

  it('waits the margin alone for an unreadable transition', () => {
    expect(settleFallbackMs('')).toBe(SETTLE_FALLBACK_MARGIN_MS);
    expect(settleFallbackMs('soon')).toBe(SETTLE_FALLBACK_MARGIN_MS);
  });
});
