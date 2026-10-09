import { describe, expect, it } from 'vitest';
import type { FrameClock } from '$lib/shared/frame-clock';
import type { LiftMetrics, LiftRect, StageRect } from './flow-lift';
import { FRAME_NOWHERE_ON_THE_STAGE, HOST_VIEWPORT_ORIGIN } from './flow-turn';
import type { Point } from './flow-turn';
import { createLiftOffer } from './lift-offer.svelte';

type Chapter = { readonly name: string };

type Clock = FrameClock & {
  readonly pending: Map<number, () => void>;
  readonly cancelled: number[];
  tick(): void;
};

type World = {
  readonly clock: Clock;
  readonly lift: ReturnType<typeof createLiftOffer<Chapter>>;
  stage: StageRect | null;
  selected: readonly LiftRect[];
  origin: Point;
  asked: Chapter[];
};

const ONE: Chapter = { name: 'one' };

const TWO: Chapter = { name: 'two' };

const LIFT: LiftMetrics = { size: 44, gap: 8 };

const STAGE: StageRect = { left: 0, top: 0, width: 414, height: 896 };

const SELECTION: LiftRect = { left: 100, top: 300, right: 260, bottom: 330 };

const ABOVE = { left: 180 - LIFT.size / 2, top: 300 - LIFT.gap - LIFT.size };

function clock(): Clock {
  const pending = new Map<number, () => void>();
  const cancelled: number[] = [];
  let next = 1;
  return {
    pending,
    cancelled,
    request: (step) => {
      const id = next;
      next += 1;
      pending.set(id, () => step(0));
      return id;
    },
    cancel: (frame) => {
      cancelled.push(frame);
      pending.delete(frame);
    },
    tick: () => {
      const steps = [...pending.values()];
      pending.clear();
      for (const step of steps) step();
    },
  };
}

function world(): World {
  const frames = clock();
  const state: World = {
    clock: frames,
    stage: STAGE,
    selected: [SELECTION],
    origin: HOST_VIEWPORT_ORIGIN,
    asked: [],
    lift: createLiftOffer<Chapter>(
      {
        stage: () => {
          const box = state.stage;
          return box === null ? null : { box: () => box, metrics: () => LIFT };
        },
        selection: (chapter) => {
          state.asked.push(chapter);
          return state.selected;
        },
        origin: () => state.origin,
      },
      frames,
    ),
  };
  return state;
}

function offered(): World {
  const held = world();
  held.lift.show(ONE);
  held.lift.ask();
  held.clock.tick();
  return held;
}

describe('createLiftOffer', () => {
  it('looks at the selection on the next frame, not at once', () => {
    const held = world();
    held.lift.show(ONE);

    held.lift.ask();
    const before = held.lift.offer;
    held.clock.tick();

    expect(before).toBeNull();
    expect(held.lift.offer).toEqual({ chapter: ONE, ...ABOVE });
  });

  it('looks once per frame however often it is asked', () => {
    const held = world();
    held.lift.show(ONE);

    held.lift.ask();
    held.lift.ask();

    expect(held.clock.pending.size).toBe(1);
  });

  it('asks again once the frame has run', () => {
    const held = offered();

    held.lift.ask();

    expect(held.clock.pending.size).toBe(1);
  });

  it('looks at the chapter shown last', () => {
    const held = world();
    held.lift.show(ONE);
    held.lift.show(TWO);

    held.lift.ask();
    held.clock.tick();

    expect(held.asked).toEqual([TWO]);
    expect(held.lift.offer?.chapter).toBe(TWO);
  });

  it('places the offer through the frame the chapter sits in', () => {
    const held = world();
    held.origin = { x: -10, y: 0 };
    held.lift.show(ONE);

    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toEqual({ chapter: ONE, left: ABOVE.left - 10, top: ABOVE.top });
  });

  it('offers nothing for a selection whose frame is nowhere on the stage', () => {
    const held = world();
    held.origin = FRAME_NOWHERE_ON_THE_STAGE;
    held.lift.show(ONE);

    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toBeNull();
  });

  it('takes the offer away when the selection collapses', () => {
    const held = offered();
    held.selected = [];

    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toBeNull();
  });

  it('takes the offer away when no chapter is shown', () => {
    const held = world();
    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toBeNull();
    expect(held.asked).toEqual([]);
  });

  it('takes the offer away when the stage is gone', () => {
    const held = offered();
    held.stage = null;

    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toBeNull();
  });

  it('hides the offer on a press and keeps it hidden while the pointer is held', () => {
    const held = offered();

    held.lift.press();
    const pressed = held.lift.offer;
    held.lift.ask();
    held.clock.tick();

    expect(pressed).toBeNull();
    expect(held.lift.offer).toBeNull();
  });

  it('offers again once the pointer is released over a selection', () => {
    const held = offered();
    held.lift.press();

    held.lift.release();
    held.clock.tick();

    expect(held.lift.offer).toEqual({ chapter: ONE, ...ABOVE });
  });

  it('places nothing on a frame that runs after the pointer is pressed again', () => {
    const held = offered();

    held.lift.press();
    held.lift.release();
    held.lift.press();
    held.clock.tick();

    expect(held.asked).toEqual([ONE, ONE]);
    expect(held.lift.offer).toBeNull();
  });

  it('dismisses a standing offer once, and reports whether there was one', () => {
    const held = offered();

    const first = held.lift.dismiss();
    const second = held.lift.dismiss();

    expect([first, second]).toEqual([true, false]);
    expect(held.lift.offer).toBeNull();
  });

  it('hands over the standing offer when taken, and clears it', () => {
    const held = offered();

    const taken = held.lift.take();

    expect(taken).toEqual({ chapter: ONE, ...ABOVE });
    expect(held.lift.offer).toBeNull();
    expect(held.lift.take()).toBeNull();
  });

  it('cancels the frame in flight and forgets everything when closed', () => {
    const held = offered();
    held.lift.press();
    held.lift.ask();

    held.lift.close();

    expect(held.clock.cancelled).toEqual([2]);
    expect(held.lift.offer).toBeNull();
  });

  it('takes a standing offer away when closed', () => {
    const held = offered();

    held.lift.close();

    expect(held.lift.offer).toBeNull();
  });

  it('cancels nothing when closed with no frame in flight', () => {
    const held = offered();

    held.lift.close();

    expect(held.clock.cancelled).toEqual([]);
  });

  it('looks at no chapter after it closes', () => {
    const held = offered();
    held.lift.close();

    held.lift.ask();
    held.clock.tick();

    expect(held.asked).toEqual([ONE]);
    expect(held.lift.offer).toBeNull();
  });

  it('forgets a held pointer when it closes', () => {
    const held = offered();
    held.lift.press();
    held.lift.close();
    held.lift.show(ONE);

    held.lift.ask();
    held.clock.tick();

    expect(held.lift.offer).toEqual({ chapter: ONE, ...ABOVE });
  });

  it('asks for a fresh frame after it closes', () => {
    const held = world();
    held.lift.ask();
    held.lift.close();

    held.lift.ask();

    expect(held.clock.pending.size).toBe(1);
  });
});
