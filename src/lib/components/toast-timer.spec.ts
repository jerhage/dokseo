import { describe, expect, it } from 'vitest';
import { ToastTimer } from './toast-timer';
import type { Clock } from './toast-timer';

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
    return this.#scheduled.filter((entry) => !entry.cancelled && entry.at > this.#time).length;
  }

  advance(ms: number): void {
    this.#time += ms;
    const due = this.#scheduled.filter((entry) => !entry.cancelled && entry.at <= this.#time);
    this.#scheduled = this.#scheduled.filter((entry) => !due.includes(entry));
    for (const entry of due) entry.run();
  }
}

function started(ms: number): { timer: ToastTimer; clock: FakeClock; expiries: () => number } {
  const clock = new FakeClock();
  let count = 0;
  const timer = new ToastTimer(
    ms,
    () => {
      count += 1;
    },
    clock,
  );
  return { timer, clock, expiries: () => count };
}

describe('ToastTimer', () => {
  it('runs from the moment it is made', () => {
    const { timer } = started(5000);

    expect(timer.kind).toBe('running');
  });

  it('expires once its time has passed', () => {
    const { clock, expiries } = started(5000);

    clock.advance(5000);

    expect(expiries()).toBe(1);
  });

  it('holds off while hovered, however long the pointer stays', () => {
    const { timer, clock, expiries } = started(5000);

    clock.advance(1000);
    timer.pause('hover');
    clock.advance(60_000);

    expect(expiries()).toBe(0);
  });

  it('cancels its scheduled expiry while paused', () => {
    const { timer, clock } = started(5000);

    timer.pause('hover');

    expect(clock.pending).toBe(0);
  });

  it('keeps the time that was left when a pause began', () => {
    const { timer, clock } = started(5000);

    clock.advance(1500);
    timer.pause('hover');
    clock.advance(9000);

    expect(timer.remaining).toBe(3500);
  });

  it('expires after only the time that was left once resumed', () => {
    const { timer, clock, expiries } = started(5000);
    clock.advance(1500);
    timer.pause('hover');
    clock.advance(9000);
    timer.resume('hover');

    clock.advance(3499);
    const early = expiries();
    clock.advance(1);

    expect([early, expiries()]).toEqual([0, 1]);
  });

  it('stays paused while focus is inside, after the pointer leaves', () => {
    const { timer, clock, expiries } = started(5000);

    timer.pause('hover');
    timer.pause('focus');
    timer.resume('hover');
    clock.advance(10_000);

    expect([timer.kind, expiries()]).toEqual(['paused', 0]);
  });

  it('pauses once for a pause repeated by the same reason', () => {
    const { timer, clock } = started(5000);

    clock.advance(1000);
    timer.pause('focus');
    clock.advance(1000);
    timer.pause('focus');
    timer.resume('focus');

    expect(timer.remaining).toBe(4000);
  });

  it('ignores a resume while it is running', () => {
    const { timer, clock } = started(5000);

    timer.resume('hover');

    expect(clock.pending).toBe(1);
  });

  it('never expires once stopped', () => {
    const { timer, clock, expiries } = started(5000);

    timer.stop();
    clock.advance(5000);

    expect([timer.kind, expiries()]).toEqual(['stopped', 0]);
  });

  it('stays stopped when a pause ends after the stop', () => {
    const { timer, clock, expiries } = started(5000);

    timer.pause('hover');
    timer.stop();
    timer.resume('hover');
    clock.advance(5000);

    expect([timer.kind, expiries()]).toEqual(['stopped', 0]);
  });

  it('reports its expiry once and stays expired when stopped afterwards', () => {
    const { timer, clock, expiries } = started(5000);

    clock.advance(5000);
    timer.stop();

    expect([timer.kind, expiries()]).toEqual(['expired', 1]);
  });
});
