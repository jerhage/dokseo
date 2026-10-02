import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import {
  ALL_CAPTURES_KEY,
  readAllCaptures,
  saveAllCaptures,
  toAllCaptures,
} from './all-captures-setting';

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

describe('toAllCaptures', () => {
  it.each([
    { stored: null, wanted: false },
    { stored: 'maybe', wanted: false },
    { stored: 'on', wanted: true },
  ])('reads $stored as $wanted', ({ stored, wanted }) => {
    expect(toAllCaptures(stored)).toBe(wanted);
  });
});

describe('readAllCaptures and saveAllCaptures', () => {
  it('reads back a saved on', () => {
    const store = new FakeStore();
    saveAllCaptures(true, () => store);

    expect(store.entries.get(ALL_CAPTURES_KEY)).toBe('on');
    expect(readAllCaptures(() => store)).toBe(true);
  });

  it('reads back a saved off', () => {
    const store = new FakeStore();
    saveAllCaptures(true, () => store);
    saveAllCaptures(false, () => store);

    expect(readAllCaptures(() => store)).toBe(false);
  });
});
