import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { idleChrome } from './idle-chrome';

function chrome(held: () => boolean = () => false) {
  const seen: boolean[] = [];
  const idle = idleChrome({ delay: 1000, held, changed: (awake) => void seen.push(awake) });
  return { idle, seen };
}

describe('idleChrome', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('starts awake', () => {
    const { idle, seen } = chrome();

    expect(idle.awake()).toBe(true);
    expect(seen).toEqual([]);

    idle.stop();
  });

  it('falls asleep once the delay passes untouched', () => {
    const { idle, seen } = chrome();

    vi.advanceTimersByTime(1000);

    expect(idle.awake()).toBe(false);
    expect(seen).toEqual([false]);

    idle.stop();
  });

  it('postpones sleep every time it is stirred', () => {
    const { idle } = chrome();

    vi.advanceTimersByTime(900);
    idle.stir();
    vi.advanceTimersByTime(900);

    expect(idle.awake()).toBe(true);

    idle.stop();
  });

  it('wakes again when stirred after sleeping', () => {
    const { idle, seen } = chrome();

    vi.advanceTimersByTime(1000);
    idle.stir();

    expect(idle.awake()).toBe(true);
    expect(seen).toEqual([false, true]);

    idle.stop();
  });

  it('reports nothing when a stir finds it already awake', () => {
    const { idle, seen } = chrome();

    idle.stir();
    idle.stir();

    expect(seen).toEqual([]);

    idle.stop();
  });

  it('stays awake for as long as something holds it', () => {
    let pinned = true;
    const { idle, seen } = chrome(() => pinned);

    vi.advanceTimersByTime(10_000);

    expect(idle.awake()).toBe(true);
    expect(seen).toEqual([]);

    pinned = false;
    vi.advanceTimersByTime(1000);

    expect(idle.awake()).toBe(false);

    idle.stop();
  });

  it('sleeps no more once it is stopped', () => {
    const { idle, seen } = chrome();

    idle.stop();
    vi.advanceTimersByTime(10_000);

    expect(idle.awake()).toBe(true);
    expect(seen).toEqual([]);
  });
});
