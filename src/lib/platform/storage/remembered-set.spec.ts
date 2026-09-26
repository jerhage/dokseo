import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rememberedSet } from './remembered-set';

const KEY = 'probe.set';

class FakeStorage {
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

let storage = new FakeStorage();

beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rememberedSet', () => {
  it('stores each added value once', () => {
    const set = rememberedSet(KEY);
    set.add('a');
    set.add('a');

    expect(rememberedSet(KEY).values()).toEqual(['a']);
  });

  it('empties the values it holds on clear', () => {
    const set = rememberedSet(KEY);
    set.add('a');

    expect(set.clear()).toEqual([]);
    expect(set.values()).toEqual([]);
  });

  it('removes the stored key on clear, so a later read starts empty', () => {
    const set = rememberedSet(KEY);
    set.add('a');
    set.clear();

    expect(storage.entries.has(KEY)).toBe(false);
    expect(rememberedSet(KEY).values()).toEqual([]);
  });

  it('adds again after a clear', () => {
    const set = rememberedSet(KEY);
    set.add('a');
    set.clear();

    expect(set.add('b')).toEqual(['b']);
  });
});
