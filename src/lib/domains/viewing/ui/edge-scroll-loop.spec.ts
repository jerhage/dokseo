import { describe, expect, it } from 'vitest';
import { EDGE_TOP_SPEED_PX_PER_S, EDGE_ZONE_PX } from './edge-scroll';
import type { EdgeBand } from './edge-scroll';
import { EdgeScroll } from './edge-scroll-loop';
import type { EdgeSurface } from './edge-scroll-loop';
import type { FrameClock } from '$lib/shared/frame-clock';

type Clock = FrameClock & {
  readonly pending: Map<number, (now: number) => void>;
  readonly cancelled: number[];
  tick(now: number): void;
};

type Surface = EdgeSurface & { band: EdgeBand };

function clock(): Clock {
  const pending = new Map<number, (now: number) => void>();
  const cancelled: number[] = [];
  let next = 1;
  return {
    pending,
    cancelled,
    request: (step) => {
      const id = next;
      next += 1;
      pending.set(id, step);
      return id;
    },
    cancel: (frame) => {
      cancelled.push(frame);
      pending.delete(frame);
    },
    tick: (now) => {
      const steps = [...pending.values()];
      pending.clear();
      for (const step of steps) step(now);
    },
  };
}

function surface(): Surface {
  const held: Surface = {
    scrollTop: 0,
    band: { top: 100, bottom: 900 },
    getBoundingClientRect: () => held.band,
  };
  return held;
}

type World = {
  readonly clock: Clock;
  readonly surface: Surface;
  readonly edge: EdgeScroll;
  dragging: boolean;
  shown: Surface | null;
};

function world(): World {
  const frames = clock();
  const held = surface();
  const state: World = {
    clock: frames,
    surface: held,
    dragging: true,
    shown: held,
    edge: new EdgeScroll({ surface: () => state.shown, dragging: () => state.dragging }, frames),
  };
  return state;
}

const NEAR_BOTTOM = 900 - EDGE_ZONE_PX / 2;
const NEAR_TOP = 100 + EDGE_ZONE_PX / 2;
const MIDDLE = 500;

describe('EdgeScroll', () => {
  it('asks for a frame when a dragging pointer moves', () => {
    const { edge, clock: frames } = world();

    edge.follow(NEAR_BOTTOM);

    expect(frames.pending.size).toBe(1);
    expect(edge.running).toBe(true);
  });

  it('asks for nothing when the pointer moves without a drag', () => {
    const held = world();
    held.dragging = false;

    held.edge.follow(NEAR_BOTTOM);

    expect(held.clock.pending.size).toBe(0);
    expect(held.edge.running).toBe(false);
  });

  it('keeps one frame in flight however often the pointer moves', () => {
    const { edge, clock: frames } = world();

    edge.follow(NEAR_BOTTOM);
    edge.follow(NEAR_BOTTOM - 1);

    expect(frames.pending.size).toBe(1);
  });

  it.each([
    { pointer: NEAR_BOTTOM, from: 0, sign: 1, gap: 16 },
    { pointer: NEAR_BOTTOM, from: 0, sign: 1, gap: 40 },
    { pointer: NEAR_TOP, from: 500, sign: -1, gap: 16 },
  ])(
    'scrolls nothing on the first frame and then by the $gap ms since the last one, from $from at $pointer',
    ({ pointer, from, sign, gap }) => {
      const { edge, clock: frames, surface: held } = world();
      held.scrollTop = from;

      edge.follow(pointer);
      frames.tick(1000);
      const first = held.scrollTop;
      frames.tick(1000 + gap);

      expect(first).toBe(from);
      expect(held.scrollTop).toBeCloseTo(
        from + (sign * EDGE_TOP_SPEED_PX_PER_S * 0.5 * gap) / 1000,
      );
      expect(frames.pending.size).toBe(1);
    },
  );

  it('follows the pointer to where it moved last', () => {
    const { edge, clock: frames, surface: held } = world();

    edge.follow(MIDDLE);
    edge.follow(NEAR_BOTTOM);
    frames.tick(1000);
    frames.tick(1016);

    expect(held.scrollTop).toBeGreaterThan(0);
  });

  it('stops once the pointer leaves the edge zone', () => {
    const { edge, clock: frames, surface: held } = world();

    edge.follow(MIDDLE);
    frames.tick(1000);

    expect(held.scrollTop).toBe(0);
    expect(frames.pending.size).toBe(0);
    expect(edge.running).toBe(false);
    expect(frames.cancelled).toEqual([]);
  });

  it('starts again from a fresh frame after a stop', () => {
    const { edge, clock: frames, surface: held } = world();

    edge.follow(NEAR_BOTTOM);
    frames.tick(1000);
    edge.stop();
    edge.follow(NEAR_BOTTOM);
    frames.tick(2000);

    expect(held.scrollTop).toBe(0);
  });

  it('stops when the drag ends between frames', () => {
    const held = world();

    held.edge.follow(NEAR_BOTTOM);
    held.dragging = false;
    held.clock.tick(1000);

    expect(held.clock.pending.size).toBe(0);
    expect(held.surface.scrollTop).toBe(0);
  });

  it('stops when the drag ends and the pointer moves again', () => {
    const held = world();

    held.edge.follow(NEAR_BOTTOM);
    held.dragging = false;
    held.edge.follow(NEAR_BOTTOM);

    expect(held.clock.cancelled).toEqual([1]);
    expect(held.edge.running).toBe(false);
  });

  it('stops when the scroller is gone', () => {
    const held = world();

    held.edge.follow(NEAR_BOTTOM);
    held.shown = null;
    held.clock.tick(1000);

    expect(held.clock.pending.size).toBe(0);
  });

  it('cancels the frame in flight when stopped', () => {
    const { edge, clock: frames } = world();

    edge.follow(NEAR_BOTTOM);
    edge.stop();

    expect(frames.cancelled).toEqual([1]);
    expect(frames.pending.size).toBe(0);
  });

  it('cancels nothing when stopped with no frame in flight', () => {
    const { edge, clock: frames } = world();

    edge.stop();

    expect(frames.cancelled).toEqual([]);
  });

  it('forgets the pointer when stopped, so a frame left over scrolls nothing', () => {
    const { edge, clock: frames, surface: held } = world();

    edge.follow(NEAR_BOTTOM);
    const step = [...frames.pending.values()][0];
    edge.stop();
    step?.(1000);

    expect(held.scrollTop).toBe(0);
    expect(frames.pending.size).toBe(0);
  });
});
