import { describe, expect, it } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { PanReach } from '../domain/overscroll';
import type { PageGroup } from '../domain/page-pairing';
import {
  SLIDE_GAP_PX,
  SLIDE_REST,
  besideOf,
  slideOffset,
  slidePanes,
  slideShift,
  slideStep,
  slideTravel,
} from './page-slide';
import type { Neighbours, Slide, SlideScene } from './page-slide';
import type { TouchState } from './touch-gesture';

const WIDTH = 390;

const ACROSS = WIDTH + SLIDE_GAP_PX;

const PREVIOUS: PageGroup = [imageIndex(0), imageIndex(1)];

const CURRENT: PageGroup = [imageIndex(2), imageIndex(3)];

const NEXT: PageGroup = [imageIndex(4)];

const BOTH: Neighbours = { decrement: PREVIOUS, increment: NEXT };

const MIDDLE: SlideScene = { width: WIDTH, direction: 'ltr', neighbours: BOTH };

const MANGA: SlideScene = { ...MIDDLE, direction: 'rtl' };

const FIRST: SlideScene = { ...MIDDLE, neighbours: { decrement: null, increment: NEXT } };

const LAST: SlideScene = { ...MIDDLE, neighbours: { decrement: PREVIOUS, increment: null } };

function press(fromX: number, toX: number) {
  return {
    id: 1,
    plan: 'swipe' as const,
    start: { x: fromX, y: 400 },
    startedAt: 0,
    at: { x: toX, y: 400 },
    strayed: true,
  };
}

function swiping(fromX: number, toX: number): TouchState {
  return { kind: 'swiping', press: press(fromX, toX) };
}

function panning(fromX: number, toX: number): TouchState {
  return { kind: 'panning', press: { ...press(fromX, toX), plan: 'pan' } };
}

const IDLE: TouchState = { kind: 'idle', pending: null };

function following(offset: number): Slide {
  return { kind: 'follow', offset };
}

describe('besideOf', () => {
  it('puts the next group on the right and the previous on the left in a left-to-right book', () => {
    expect(besideOf('increment', 'ltr')).toBe(1);
    expect(besideOf('decrement', 'ltr')).toBe(-1);
  });

  it('mirrors the neighbours in a right-to-left book', () => {
    expect(besideOf('increment', 'rtl')).toBe(-1);
    expect(besideOf('decrement', 'rtl')).toBe(1);
  });
});

describe('slideTravel', () => {
  it('reports the horizontal travel of a swipe', () => {
    expect(slideTravel(swiping(300, 180), null)).toBe(-120);
  });

  it('reports only the travel past the edge while a pan is under way', () => {
    const reach: PanReach = {
      origin: { zoom: 2, panX: -WIDTH + 40, panY: 0 },
      content: { width: WIDTH, height: 700 },
      frame: { width: WIDTH, height: 700 },
    };

    expect(slideTravel(panning(300, 200), reach)).toBe(-60);
  });

  it('reports nothing for a pan in the middle of the page', () => {
    const reach: PanReach = {
      origin: { zoom: 2, panX: -WIDTH / 2, panY: 0 },
      content: { width: WIDTH, height: 700 },
      frame: { width: WIDTH, height: 700 },
    };

    expect(slideTravel(panning(300, 200), reach)).toBe(0);
  });

  it('reports nothing for a pan without a reach or for any other state', () => {
    expect(slideTravel(panning(300, 200), null)).toBe(0);
    expect(slideTravel(IDLE, null)).toBe(0);
    expect(slideTravel({ kind: 'selecting', id: 1 }, null)).toBe(0);
  });
});

describe('slideOffset', () => {
  it('follows the finger where a neighbour waits on that side', () => {
    expect(slideOffset(-120, MIDDLE)).toBe(-120);
    expect(slideOffset(90, MIDDLE)).toBe(90);
  });

  it('stops once the neighbour has arrived', () => {
    expect(slideOffset(-900, MIDDLE)).toBe(-ACROSS);
    expect(slideOffset(900, MIDDLE)).toBe(ACROSS);
  });

  it('resists a drag towards the missing group before the first one', () => {
    const offset = slideOffset(200, FIRST);

    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(100);
    expect(slideOffset(-200, FIRST)).toBe(-200);
  });

  it('resists a drag past the last group, and never lets the page leave', () => {
    expect(slideOffset(-200, LAST)).toBeGreaterThan(-100);
    expect(slideOffset(-100_000, LAST)).toBeGreaterThan(-WIDTH);
  });

  it('resists on the mirrored side in a right-to-left book', () => {
    const atTheEnd: SlideScene = { ...MANGA, neighbours: { decrement: PREVIOUS, increment: null } };

    expect(slideOffset(200, atTheEnd)).toBeLessThan(100);
    expect(slideOffset(-200, atTheEnd)).toBe(-200);
  });

  it('stays put for no travel, a travel that is not a number, or a frame with no width', () => {
    expect(slideOffset(0, MIDDLE)).toBe(0);
    expect(slideOffset(Number.NaN, MIDDLE)).toBe(0);
    expect(slideOffset(-120, { ...MIDDLE, width: 0 })).toBe(0);
  });
});

describe('slideStep', () => {
  it('follows while the finger swipes or pans', () => {
    expect(slideStep(SLIDE_REST, swiping(300, 180), -120, null, MIDDLE)).toEqual(following(-120));
    expect(slideStep(following(-60), panning(300, 180), -80, null, MIDDLE)).toEqual(following(-80));
  });

  it('completes the slide towards the turn the release asked for', () => {
    expect(slideStep(following(-120), IDLE, -120, 'increment', MIDDLE)).toEqual({
      kind: 'settle',
      offset: -ACROSS,
      move: 'increment',
    });
    expect(slideStep(following(120), IDLE, 120, 'decrement', MIDDLE)).toEqual({
      kind: 'settle',
      offset: ACROSS,
      move: 'decrement',
    });
  });

  it('completes the slide leftward for a forward turn in a right-to-left book', () => {
    expect(slideStep(following(120), IDLE, 120, 'increment', MANGA)).toEqual({
      kind: 'settle',
      offset: ACROSS,
      move: 'increment',
    });
  });

  it('lands the neighbour it turns to exactly on the current slot, in either direction', () => {
    for (const scene of [MIDDLE, MANGA]) {
      for (const move of ['increment', 'decrement'] as const) {
        const travel = besideOf(move, scene.direction) * -120;
        const end = slideStep(following(travel), IDLE, travel, move, scene);

        expect(slideShift(end) + besideOf(move, scene.direction) * ACROSS).toBe(0);
      }
    }
  });

  it('snaps back when the release turns nothing', () => {
    expect(slideStep(following(-30), IDLE, -30, null, MIDDLE)).toEqual({
      kind: 'settle',
      offset: 0,
      move: null,
    });
  });

  it('snaps back at the first group even when the release asks to turn', () => {
    expect(slideStep(following(40), IDLE, 200, 'decrement', FIRST)).toEqual({
      kind: 'settle',
      offset: 0,
      move: null,
    });
  });

  it('snaps back when a second finger turns the swipe into a pinch', () => {
    const pinching: TouchState = {
      kind: 'pinching',
      first: { id: 1, at: { x: 100, y: 400 } },
      second: { id: 2, at: { x: 200, y: 400 } },
    };

    expect(slideStep(following(-50), pinching, 0, null, MIDDLE)).toEqual({
      kind: 'settle',
      offset: 0,
      move: null,
    });
  });

  it('rests when the finger never moved the page, so the turn stays instant', () => {
    expect(slideStep(following(0), IDLE, 0, 'increment', MIDDLE)).toEqual(SLIDE_REST);
    expect(slideStep(SLIDE_REST, IDLE, 0, 'increment', MIDDLE)).toEqual(SLIDE_REST);
  });

  it('leaves a settling slide alone until it finishes', () => {
    const settling: Slide = { kind: 'settle', offset: -ACROSS, move: 'increment' };

    expect(slideStep(settling, swiping(300, 100), -200, null, MIDDLE)).toBe(settling);
    expect(slideStep(settling, IDLE, 0, 'decrement', MIDDLE)).toBe(settling);
  });
});

describe('slideShift', () => {
  it('shifts by the offset while following or settling, and not at rest', () => {
    expect(slideShift(SLIDE_REST)).toBe(0);
    expect(slideShift(following(-42))).toBe(-42);
    expect(slideShift({ kind: 'settle', offset: ACROSS, move: 'decrement' })).toBe(ACROSS);
  });
});

describe('slidePanes', () => {
  it('lays the groups out in reading order with the neighbours on their sides', () => {
    expect(slidePanes(CURRENT, BOTH, 'ltr')).toEqual([
      { key: 0, pages: PREVIOUS, beside: -1 },
      { key: 2, pages: CURRENT, beside: 0 },
      { key: 4, pages: NEXT, beside: 1 },
    ]);
  });

  it('mirrors the sides in a right-to-left book', () => {
    expect(slidePanes(CURRENT, BOTH, 'rtl').map((pane) => pane.beside)).toEqual([1, 0, -1]);
  });

  it('keys a group by its first image, so a neighbour keeps its pane when it becomes current', () => {
    const before = slidePanes(CURRENT, BOTH, 'ltr').find((pane) => pane.beside === 1);
    const after = slidePanes(NEXT, { decrement: CURRENT, increment: null }, 'ltr').find(
      (pane) => pane.beside === 0,
    );

    expect(after?.key).toBe(before?.key);
  });

  it('leaves out a missing neighbour and an empty group', () => {
    expect(slidePanes(CURRENT, { decrement: null, increment: NEXT }, 'ltr')).toHaveLength(2);
    expect(slidePanes([], { decrement: null, increment: null }, 'ltr')).toEqual([]);
  });
});
