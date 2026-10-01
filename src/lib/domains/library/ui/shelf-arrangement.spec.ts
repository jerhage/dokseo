import { describe, expect, it } from 'vitest';
import type { StringStore } from '$lib/platform/storage/remembered-string';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { SHELF_KEY, SORT_KEY, VIEW_KEY } from './library-arrangement';
import { ShelfArrangement } from './shelf-arrangement.svelte';

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

function comic(title: string, page: number): Book {
  return {
    id: bookId(title),
    title,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 10,
    addedAt: 0,
    position: imagePlace(imageIndex(page)),
    lastReadAt: null,
    finishedAt: null,
  };
}

describe('ShelfArrangement', () => {
  it('starts from the saved shelf, sort and view', () => {
    const store = new FakeStore({
      [SHELF_KEY]: 'reading',
      [SORT_KEY]: 'title',
      [VIEW_KEY]: 'list',
    });
    const arrangement = new ShelfArrangement(() => store);

    expect([arrangement.shelf.value, arrangement.order.value, arrangement.layout.value]).toEqual([
      'reading',
      'title',
      'list',
    ]);
  });

  it('saves each choice under its own key', () => {
    const store = new FakeStore();
    const arrangement = new ShelfArrangement(() => store);

    arrangement.shelf.choose('finished');
    arrangement.order.choose('progress');
    arrangement.layout.choose('list');

    expect(Object.fromEntries(store.entries)).toEqual({
      [SHELF_KEY]: 'finished',
      [SORT_KEY]: 'progress',
      [VIEW_KEY]: 'list',
    });
  });

  it('keeps only the books on the chosen shelf, in the chosen order', () => {
    const arrangement = new ShelfArrangement(() => new FakeStore());
    const books = [comic('c', 3), comic('a', 5), comic('b', 0)];

    arrangement.shelf.choose('reading');
    arrangement.order.choose('title');

    expect(arrangement.arrange(books).map((book) => book.title)).toEqual(['a', 'c']);
  });
});
