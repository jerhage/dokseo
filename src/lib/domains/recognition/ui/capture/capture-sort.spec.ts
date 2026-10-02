import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { CAPTURE_SORT_KEY, readCaptureSort, saveCaptureSort, toCaptureSort } from './capture-sort';

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

describe('toCaptureSort', () => {
  it.each([null, 'oldest'])('reads an unknown value as book order, given %s', (stored) => {
    expect(toCaptureSort(stored)).toBe('book');
  });

  it('reads newest as newest first', () => {
    expect(toCaptureSort('newest')).toBe('newest');
  });
});

describe('readCaptureSort and saveCaptureSort', () => {
  it('reads back a saved newest first', () => {
    const store = new FakeStore();
    saveCaptureSort('newest', () => store);

    expect(store.entries.get(CAPTURE_SORT_KEY)).toBe('newest');
    expect(readCaptureSort(() => store)).toBe('newest');
  });

  it('reads back a saved book order', () => {
    const store = new FakeStore();
    saveCaptureSort('newest', () => store);
    saveCaptureSort('book', () => store);

    expect(readCaptureSort(() => store)).toBe('book');
  });

  it('reads book order when no store is reachable', () => {
    expect(readCaptureSort(() => null)).toBe('book');
  });
});
