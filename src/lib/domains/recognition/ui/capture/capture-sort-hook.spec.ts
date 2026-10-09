import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { createCaptureSort } from './capture-sort-choice.svelte';
import { CAPTURE_SORT_KEY } from './capture-sort';

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

describe('createCaptureSort', () => {
  it('sorts by book order until the reader chooses otherwise', () => {
    expect(createCaptureSort(() => new FakeStore()).sort).toBe('book');
  });

  it('stores the choice and starts from it the next time', () => {
    const store = new FakeStore();
    createCaptureSort(() => store).sortBy('newest');

    expect(store.getItem(CAPTURE_SORT_KEY)).toBe('newest');
    expect(createCaptureSort(() => store).sort).toBe('newest');
  });
});
