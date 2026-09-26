import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { TOUCH_TURNS_KEY, readTouchTurns, saveTouchTurns, toTouchTurns } from './touch-turns';

class FakeStore implements StringStore {
  readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

describe('toTouchTurns', () => {
  it('defaults to swipe only when nothing was stored', () => {
    expect(toTouchTurns(null)).toBe('swipe-only');
  });

  it('defaults to swipe only when the stored value is unknown', () => {
    expect(toTouchTurns('sideways')).toBe('swipe-only');
  });

  it('keeps a stored tap-zones choice', () => {
    expect(toTouchTurns('tap-zones')).toBe('tap-zones');
  });

  it('keeps a stored swipe-only choice', () => {
    expect(toTouchTurns('swipe-only')).toBe('swipe-only');
  });
});

describe('the remembered page-turn choice', () => {
  it('reads back what was saved, under a reader key', () => {
    const store = new FakeStore();
    saveTouchTurns('swipe-only', () => store);

    expect(store.entries.get(TOUCH_TURNS_KEY)).toBe('swipe-only');
    expect(TOUCH_TURNS_KEY.startsWith('reader.')).toBe(true);
    expect(readTouchTurns(() => store)).toBe('swipe-only');
  });

  it('reads swipe only when no store is available', () => {
    expect(readTouchTurns(() => null)).toBe('swipe-only');
  });
});
