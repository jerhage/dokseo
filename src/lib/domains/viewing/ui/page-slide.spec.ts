import { describe, expect, it } from 'vitest';
import {
  CAROUSEL_REST,
  carouselNeighbours,
  carouselShift,
  carouselStep,
} from '$lib/components/carousel';
import type { CarouselMotion, CarouselScene } from '$lib/components/carousel';
import type { GestureState } from '$lib/components/gesture';
import { imageIndex } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { PanReach } from '../domain/overscroll';
import type { PageGroup } from '../domain/page-pairing';
import type { PageMove } from './page-moves';
import { besideOf, moveOf, slideInput, slidePanes, slideTravel } from './page-slide';
import type { Neighbours } from './page-slide';

type BookScene = { readonly direction: ReadingDirection; readonly neighbours: Neighbours };

const WIDTH = 390;

const GAP = 16;

const ACROSS = WIDTH + GAP;

const PREVIOUS: PageGroup = [imageIndex(0), imageIndex(1)];

const CURRENT: PageGroup = [imageIndex(2), imageIndex(3)];

const NEXT: PageGroup = [imageIndex(4)];

const BOTH: Neighbours = { decrement: PREVIOUS, increment: NEXT };

const MIDDLE: BookScene = { direction: 'ltr', neighbours: BOTH };

const MANGA: BookScene = { ...MIDDLE, direction: 'rtl' };

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

function swiping(fromX: number, toX: number): GestureState {
  return { kind: 'swiping', press: press(fromX, toX) };
}

function panning(fromX: number, toX: number): GestureState {
  return { kind: 'panning', press: { ...press(fromX, toX), plan: 'pan' } };
}

const IDLE: GestureState = { kind: 'idle', pending: null };

function following(offset: number): CarouselMotion {
  return { kind: 'follow', offset };
}

function slideStep(
  motion: CarouselMotion,
  state: GestureState,
  travel: number,
  turn: PageMove | null,
  scene: BookScene,
): CarouselMotion {
  const carousel: CarouselScene = {
    width: WIDTH,
    gap: GAP,
    direction: 'ltr',
    neighbours: carouselNeighbours(slidePanes(CURRENT, scene.neighbours, scene.direction)),
  };
  return carouselStep(motion, slideInput(state, travel, turn, scene.direction), carousel);
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

describe('moveOf', () => {
  it('turns the side a slide settled on back into the page move beside that side', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      for (const move of ['increment', 'decrement'] as const) {
        expect(moveOf(besideOf(move, direction), direction)).toBe(move);
      }
    }
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

describe('slideInput, stepped by the carousel', () => {
  it('follows while the finger swipes or pans', () => {
    expect(slideStep(CAROUSEL_REST, swiping(300, 180), -120, null, MIDDLE)).toEqual(
      following(-120),
    );
    expect(slideStep(following(-60), panning(300, 180), -80, null, MIDDLE)).toEqual(following(-80));
  });

  it('completes the slide towards the turn the release asked for', () => {
    expect(slideStep(following(-120), IDLE, -120, 'increment', MIDDLE)).toEqual({
      kind: 'settle',
      offset: -ACROSS,
      towards: 1,
    });
    expect(slideStep(following(120), IDLE, 120, 'decrement', MIDDLE)).toEqual({
      kind: 'settle',
      offset: ACROSS,
      towards: -1,
    });
  });

  it('lands the neighbour it turns to exactly on the current slot, in either direction', () => {
    for (const scene of [MIDDLE, MANGA]) {
      for (const move of ['increment', 'decrement'] as const) {
        const travel = besideOf(move, scene.direction) * -120;
        const end = slideStep(following(travel), IDLE, travel, move, scene);

        expect(carouselShift(end) + besideOf(move, scene.direction) * ACROSS).toBe(0);
      }
    }
  });

  it.each<{ readonly state: GestureState; readonly from: number; readonly travel: number }>([
    { state: IDLE, from: -30, travel: -30 },
    {
      state: {
        kind: 'pinching',
        first: { id: 1, at: { x: 100, y: 400 } },
        second: { id: 2, at: { x: 200, y: 400 } },
      },
      from: -50,
      travel: 0,
    },
  ])('snaps back when a $state.kind release turns nothing', ({ state, from, travel }) => {
    expect(slideStep(following(from), state, travel, null, MIDDLE)).toEqual({
      kind: 'settle',
      offset: 0,
      towards: null,
    });
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
