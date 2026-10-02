import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import {
  EDGE_CLICKS_KEY,
  readEdgeClicksTurn,
  saveEdgeClicksTurn,
  toEdgeClicksTurn,
} from './edge-clicks-setting';

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

describe('toEdgeClicksTurn', () => {
  it.each([
    ['nothing stored as on', null, true],
    ['an unknown stored value as on', 'sideways', true],
    ['a stored on as on', 'on', true],
    ['a stored off as off', 'off', false],
  ])('reads edge clicks from %s', (_name, stored, turns) => {
    expect(toEdgeClicksTurn(stored)).toBe(turns);
  });
});

describe('the remembered edge click choice', () => {
  it('reads back what was saved, under a reader key', () => {
    const store = new FakeStore();
    saveEdgeClicksTurn(false, () => store);

    expect(store.entries.get(EDGE_CLICKS_KEY)).toBe('off');
    expect(EDGE_CLICKS_KEY.startsWith('reader.')).toBe(true);
    expect(readEdgeClicksTurn(() => store)).toBe(false);

    saveEdgeClicksTurn(true, () => store);

    expect(store.entries.get(EDGE_CLICKS_KEY)).toBe('on');
    expect(readEdgeClicksTurn(() => store)).toBe(true);
  });

  it('reads on when no store is available', () => {
    expect(readEdgeClicksTurn(() => null)).toBe(true);
  });
});
