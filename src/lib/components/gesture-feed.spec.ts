import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, LONG_PRESS_MS } from './gesture';
import type { GestureContext, GestureIntent, GestureTick } from './gesture';
import { GestureFeed } from './gesture-feed';
import type { Clock } from './clock';

type Scheduled = { readonly at: number; readonly run: () => void; cancelled: boolean };

class FakeClock implements Clock {
  #time = 0;
  #scheduled: Scheduled[] = [];

  readonly now = (): number => this.#time;

  readonly schedule = (run: () => void, ms: number): (() => void) => {
    const entry: Scheduled = { at: this.#time + ms, run, cancelled: false };
    this.#scheduled.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };

  get pending(): number {
    return this.#scheduled.filter((entry) => !entry.cancelled).length;
  }

  advance(ms: number): void {
    this.#time += ms;
    const due = this.#scheduled.filter((entry) => !entry.cancelled && entry.at <= this.#time);
    this.#scheduled = this.#scheduled.filter((entry) => !due.includes(entry));
    for (const entry of due) entry.run();
  }
}

const CONTEXT: GestureContext = {
  pannable: false,
  selectMode: false,
  waitsForDoubleTap: () => true,
};

const FINGER = { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 200 };

function fed(): { feed: GestureFeed; clock: FakeClock; heard: GestureIntent[] } {
  const clock = new FakeClock();
  const heard: GestureIntent[] = [];
  const feed: GestureFeed = new GestureFeed((tick: GestureTick) => {
    const step = feed.step(tick, CONTEXT);
    if (step.intent.kind !== 'none') heard.push(step.intent);
  }, clock);
  return { feed, clock, heard };
}

describe('GestureFeed', () => {
  it('reads a pointer into a sample stamped by its clock', () => {
    const { feed, clock } = fed();
    clock.advance(250);

    expect(feed.sample('down', FINGER)).toEqual({
      kind: 'down',
      id: 1,
      type: 'touch',
      x: 100,
      y: 200,
      t: 250,
    });
  });

  it('ticks at the long press deadline, and the tick reports the long press', () => {
    const { feed, clock, heard } = fed();
    feed.step(feed.sample('down', FINGER), CONTEXT);
    clock.advance(LONG_PRESS_MS - 1);

    expect(heard).toEqual([]);
    clock.advance(1);

    expect(heard).toEqual([{ kind: 'long-press', x: 100, y: 200 }]);
    expect(feed.state.kind).toBe('selecting');
  });

  it('ticks when a held tap runs out of its double-tap window', () => {
    const { feed, clock, heard } = fed();
    feed.step(feed.sample('down', FINGER), CONTEXT);
    clock.advance(60);
    feed.step(feed.sample('up', FINGER), CONTEXT);
    clock.advance(DOUBLE_TAP_MS);

    expect(heard).toEqual([{ kind: 'tap', x: 100, y: 200 }]);
    expect(clock.pending).toBe(0);
  });

  it('keeps one timer armed at most, re-armed after every step', () => {
    const { feed, clock } = fed();
    feed.step(feed.sample('down', FINGER), CONTEXT);
    feed.step(feed.sample('move', FINGER), CONTEXT);
    feed.step(feed.sample('move', FINGER), CONTEXT);

    expect(clock.pending).toBe(1);
  });

  it('arms no timer while nothing waits', () => {
    const { feed, clock } = fed();
    feed.step(feed.sample('down', FINGER), CONTEXT);
    feed.step(feed.sample('move', { ...FINGER, clientX: 180 }), CONTEXT);

    expect(clock.pending).toBe(0);
  });

  it('stops its timer, so no tick arrives after the owner has gone', () => {
    const { feed, clock, heard } = fed();
    feed.step(feed.sample('down', FINGER), CONTEXT);
    feed.stop();
    clock.advance(LONG_PRESS_MS * 2);

    expect(heard).toEqual([]);
    expect(clock.pending).toBe(0);
  });
});
