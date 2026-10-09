import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { SHELF_KEY, SORT_KEY, VIEW_KEY } from './library-arrangement';
import { createShelfArrangement } from './shelf-arrangement.svelte';

class FakeStore implements StringStore {
  readonly entries = new Map<string, string>();

  constructor(initial: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(initial)) this.entries.set(key, value);
  }

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

describe('createShelfArrangement', () => {
  it('starts from the saved shelf, sort and view', () => {
    const store = new FakeStore({
      [SHELF_KEY]: 'reading',
      [SORT_KEY]: 'title',
      [VIEW_KEY]: 'list',
    });
    const arrangement = createShelfArrangement(() => store);

    expect([arrangement.shelf, arrangement.order, arrangement.layout]).toEqual([
      'reading',
      'title',
      'list',
    ]);
  });

  it('saves each choice under its own key', () => {
    const store = new FakeStore();
    const arrangement = createShelfArrangement(() => store);

    arrangement.chooseShelf('finished');
    arrangement.chooseOrder('progress');
    arrangement.chooseLayout('list');

    expect(Object.fromEntries(store.entries)).toEqual({
      [SHELF_KEY]: 'finished',
      [SORT_KEY]: 'progress',
      [VIEW_KEY]: 'list',
    });
  });
});
