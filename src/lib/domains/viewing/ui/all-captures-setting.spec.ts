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
  it('reads nothing stored as off', () => {
    expect(toAllCaptures(null)).toBe(false);
  });

  it('reads an unknown value as off', () => {
    expect(toAllCaptures('maybe')).toBe(false);
  });

  it('reads on as on', () => {
    expect(toAllCaptures('on')).toBe(true);
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

  it('reads off when no store is reachable', () => {
    expect(readAllCaptures(() => null)).toBe(false);
  });
});
