import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import {
  GESTURE_HINTS_KEY,
  readGestureHints,
  saveGestureHints,
  toGestureHints,
} from './gesture-hints-setting';

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

describe('toGestureHints', () => {
  it.each([
    { stored: null, wanted: true },
    { stored: 'maybe', wanted: true },
    { stored: 'off', wanted: false },
  ])('reads $stored as $wanted', ({ stored, wanted }) => {
    expect(toGestureHints(stored)).toBe(wanted);
  });
});

describe('readGestureHints and saveGestureHints', () => {
  it('reads back a saved off', () => {
    const store = new FakeStore();
    saveGestureHints(false, () => store);

    expect(store.entries.get(GESTURE_HINTS_KEY)).toBe('off');
    expect(readGestureHints(() => store)).toBe(false);
  });

  it('reads back a saved on', () => {
    const store = new FakeStore();
    saveGestureHints(false, () => store);
    saveGestureHints(true, () => store);

    expect(readGestureHints(() => store)).toBe(true);
  });
});
