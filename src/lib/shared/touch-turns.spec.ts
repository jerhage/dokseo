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
  it.each([
    ['nothing stored as swipe only', null, 'swipe-only'],
    ['an unknown stored value as swipe only', 'sideways', 'swipe-only'],
    ['a stored tap-zones choice as tap zones', 'tap-zones', 'tap-zones'],
    ['a stored swipe-only choice as swipe only', 'swipe-only', 'swipe-only'],
  ])('reads page turns from %s', (_name, stored, turns) => {
    expect(toTouchTurns(stored)).toBe(turns);
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
