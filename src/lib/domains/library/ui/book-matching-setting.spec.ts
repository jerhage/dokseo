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
  it.each([
    { stored: null, matching: 'content' },
    { stored: 'bytes', matching: 'content' },
    { stored: 'file-name', matching: 'file-name' },
  ] as const)('reads $stored as $matching', ({ stored, matching }) => {
    expect(toBookMatching(stored)).toBe(matching);
  });
});

describe('readBookMatching and saveBookMatching', () => {
  it('reads back a saved choice under its key', () => {
    const store = new FakeStore();
    saveBookMatching('file-name', () => store);

    expect(store.entries.get(BOOK_MATCHING_KEY)).toBe('file-name');
    expect(readBookMatching(() => store)).toBe('file-name');
  });
});

describe('BOOK_MATCHING_OPTIONS', () => {
  it('offers content first and file name second', () => {
    expect(BOOK_MATCHING_OPTIONS.map((option) => option.label)).toEqual(['Content', 'File name']);
  });
});
