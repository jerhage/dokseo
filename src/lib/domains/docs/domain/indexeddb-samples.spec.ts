import { describe, expect, it } from 'vitest';
import {
  DUPLICATE_ATTEMPT,
  QUERY_PRESETS,
  SAMPLE_BOOKS,
  SAMPLE_CAPTURES,
  queryPreset,
} from './indexeddb-samples';

describe('the IndexedDB samples', () => {
  it('gives every query preset its own key', () => {
    const keys = QUERY_PRESETS.map((preset) => preset.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(queryPreset('count').code).toBe("captures.index('bookId').count('b1')");
  });

  it('adds the captures out of time order, so an index has an order to show', () => {
    const times = SAMPLE_CAPTURES.map((capture) => capture.createdAt);

    expect(times).not.toEqual(times.toSorted((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  it('points every capture at a sample book', () => {
    const ids = new Set(SAMPLE_BOOKS.map((book) => book.id));

    expect(SAMPLE_CAPTURES.every((capture) => ids.has(capture.bookId))).toBe(true);
  });

  it('repeats an existing hash in the clashing book and no other', () => {
    const hashes = SAMPLE_BOOKS.map((book) => book.hash);

    expect(hashes).toContain(DUPLICATE_ATTEMPT.clash.hash);
    expect(hashes).not.toContain(DUPLICATE_ATTEMPT.fresh.hash);
  });
});
