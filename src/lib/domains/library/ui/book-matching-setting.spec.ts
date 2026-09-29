import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import {
  BOOK_MATCHING_KEY,
  BOOK_MATCHING_OPTIONS,
  readBookMatching,
  saveBookMatching,
  toBookMatching,
} from './book-matching-setting';

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

describe('toBookMatching', () => {
  it('reads nothing stored as content', () => {
    expect(toBookMatching(null)).toBe('content');
  });

  it('reads an unknown value as content', () => {
    expect(toBookMatching('bytes')).toBe('content');
  });

  it('reads file-name as file-name', () => {
    expect(toBookMatching('file-name')).toBe('file-name');
  });
});

describe('readBookMatching and saveBookMatching', () => {
  it('reads back a saved choice under its key', () => {
    const store = new FakeStore();
    saveBookMatching('file-name', () => store);

    expect(store.entries.get(BOOK_MATCHING_KEY)).toBe('file-name');
    expect(readBookMatching(() => store)).toBe('file-name');
  });

  it('reads content when no store is reachable', () => {
    expect(readBookMatching(() => null)).toBe('content');
  });
});

describe('BOOK_MATCHING_OPTIONS', () => {
  it('offers content first and file name second', () => {
    expect(BOOK_MATCHING_OPTIONS.map((option) => option.label)).toEqual(['Content', 'File name']);
  });
});
