import { describe, expect, it } from 'vitest';
import type { Clock } from '$lib/components/clock';
import { GesturePad } from './gesture-pad.svelte';

type ManualClock = Clock & { advance: (ms: number) => void };

function manualClock(): ManualClock {
  let now = 0;
  let due: { at: number; run: () => void } | null = null;
  return {
    now: () => now,
    schedule: (run, ms) => {
      const job = { at: now + ms, run };
      due = job;
      return () => {
        if (due === job) due = null;
      };
    },
    advance: (ms) => {
      now += ms;
      const job = due;
      if (job !== null && job.at <= now) {
        due = null;
        job.run();
      }
    },
  };
}

function finger(x: number, y: number, pointerId = 1) {
  return { pointerId, pointerType: 'touch', clientX: x, clientY: y };
}

function padWith(clock: ManualClock, waits = false): GesturePad {
  return new GesturePad(
    {
      context: () => ({ pannable: false, selectMode: false, waitsForDoubleTap: () => waits }),
      area: () => ({ width: 400, turns: 'tap-zones' }),
    },
    clock,
  );
}

describe('GesturePad', () => {
  it('reports a still release as a tap with its distance and duration', () => {
    const clock = manualClock();
    const pad = padWith(clock);

    pad.pointer('down', finger(100, 100));
    clock.advance(90);
    pad.pointer('up', finger(103, 104));

    expect(pad.readings[0]).toMatchObject({ kind: 'tap', distance: 5, duration: 90 });
  });

  it('measures a waited tap from its own press and release, not from the tick', () => {
    const clock = manualClock();
    const pad = padWith(clock, true);

    pad.pointer('down', finger(200, 100));
    clock.advance(60);
    pad.pointer('up', finger(200, 100));
    expect(pad.readings).toHaveLength(0);
    clock.advance(300);

    expect(pad.readings[0]).toMatchObject({ kind: 'tap', duration: 60 });
  });

  it('reports a long press after 400 ms held still', () => {
    const clock = manualClock();
    const pad = padWith(clock);

    pad.pointer('down', finger(100, 100));
    clock.advance(400);

    expect(pad.state).toBe('selecting');
    expect(pad.readings[0]).toMatchObject({ kind: 'long-press', duration: 400 });
  });

  it('reports a fast sideways stroke as a swipe that turns', () => {
    const clock = manualClock();
    const pad = padWith(clock);

    pad.pointer('down', finger(300, 100));
    clock.advance(50);
    pad.pointer('move', finger(250, 102));
    clock.advance(50);
    pad.pointer('up', finger(200, 104));

    expect(pad.readings[0]?.kind).toBe('swipe');
    expect(pad.readings[0]?.swipe?.turn).toBe('right');
  });

  it('folds consecutive moves of one finger into one trace line', () => {
    const clock = manualClock();
    const pad = padWith(clock);

    pad.pointer('down', finger(300, 100));
    pad.pointer('move', finger(290, 100));
    pad.pointer('move', finger(280, 100));
    pad.pointer('move', finger(270, 100));

    expect(pad.trace[0]).toMatchObject({ key: 'move #1', repeats: 3 });
  });
});
