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

class ThrowingStore implements StringStore {
  getItem(): string | null {
    throw new Error('blocked');
  }

  setItem(): void {
    throw new Error('blocked');
  }

  removeItem(): void {
    throw new Error('blocked');
  }
}

describe('toSortOrder', () => {
  it('reads every known sort order', () => {
    expect(toSortOrder('added')).toBe('added');
    expect(toSortOrder('title')).toBe('title');
    expect(toSortOrder('progress')).toBe('progress');
  });

  it('falls back to recently added for an unknown or missing value', () => {
    expect(toSortOrder('newest')).toBe('added');
    expect(toSortOrder(null)).toBe('added');
  });
});

describe('toCollectionView', () => {
  it('reads both views', () => {
    expect(toCollectionView('grid')).toBe('grid');
    expect(toCollectionView('list')).toBe('list');
  });

  it('falls back to covers for an unknown or missing value', () => {
    expect(toCollectionView('table')).toBe('grid');
    expect(toCollectionView(null)).toBe('grid');
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

  it('answers the defaults when nothing is saved', () => {
    expect(readArrangement(() => new FakeStore())).toEqual({
      shelf: 'all',
      order: 'added',
      layout: 'grid',
    });
  });

  it('answers the defaults for values it does not know', () => {
    const store = new FakeStore({ [SHELF_KEY]: 'later', [SORT_KEY]: 'size', [VIEW_KEY]: 'wall' });

    expect(readArrangement(() => store)).toEqual({
      shelf: 'all',
      order: 'added',
      layout: 'grid',
    });
  });

  it('answers the defaults when there is no store', () => {
    expect(readArrangement(() => null)).toEqual({ shelf: 'all', order: 'added', layout: 'grid' });
  });

  it('answers the defaults when the store throws', () => {
    expect(readArrangement(() => new ThrowingStore())).toEqual({
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

  it('reads back what it saved', () => {
    const store = new FakeStore();

    saveShelf('unread', () => store);
    saveSortOrder('title', () => store);
    saveCollectionView('list', () => store);

    expect(readArrangement(() => store)).toEqual({
      shelf: 'unread',
      order: 'title',
      layout: 'list',
    });
  });

  it('stores nothing and does not throw when the store throws', () => {
    expect(() => {
      saveShelf('reading', () => new ThrowingStore());
      saveSortOrder('title', () => new ThrowingStore());
      saveCollectionView('list', () => new ThrowingStore());
    }).not.toThrow();
  });
});
