import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import {
  SHELF_KEY,
  SORT_KEY,
  VIEW_KEY,
  readArrangement,
  saveCollectionView,
  saveShelf,
  saveSortOrder,
  toCollectionView,
  toSortOrder,
} from './library-arrangement';

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

describe('toSortOrder', () => {
  it.each([
    { stored: 'added', order: 'added' },
    { stored: 'title', order: 'title' },
    { stored: 'progress', order: 'progress' },
    { stored: 'newest', order: 'added' },
    { stored: null, order: 'added' },
  ] as const)('reads $stored as $order', ({ stored, order }) => {
    expect(toSortOrder(stored)).toBe(order);
  });
});

describe('toCollectionView', () => {
  it.each([
    { stored: 'grid', view: 'grid' },
    { stored: 'list', view: 'list' },
    { stored: 'table', view: 'grid' },
    { stored: null, view: 'grid' },
  ] as const)('reads $stored as $view', ({ stored, view }) => {
    expect(toCollectionView(stored)).toBe(view);
  });
});

describe('readArrangement', () => {
  it('reads the saved shelf, sort and view', () => {
    const store = new FakeStore({
      [SHELF_KEY]: 'reading',
      [SORT_KEY]: 'title',
      [VIEW_KEY]: 'list',
    });

    expect(readArrangement(() => store)).toEqual({
      shelf: 'reading',
      order: 'title',
      layout: 'list',
    });
  });

  it.each([
    { saved: 'nothing', entries: {} },
    {
      saved: 'values it does not know',
      entries: { [SHELF_KEY]: 'later', [SORT_KEY]: 'size', [VIEW_KEY]: 'wall' },
    },
  ])('answers the defaults when $saved is saved', ({ entries }) => {
    expect(readArrangement(() => new FakeStore(entries))).toEqual({
      shelf: 'all',
      order: 'added',
      layout: 'grid',
    });
  });
});

describe('saving the arrangement', () => {
  it('stores each choice under its own key', () => {
    const store = new FakeStore();

    saveShelf('finished', () => store);
    saveSortOrder('progress', () => store);
    saveCollectionView('list', () => store);

    expect(Object.fromEntries(store.entries)).toEqual({
      'reader.library.shelf': 'finished',
      'reader.library.sort': 'progress',
      'reader.library.view': 'list',
    });
  });
});
