import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { StoredBook } from '../domain/book/stored-book';
import { createLibraryRepository } from './indexeddb-opfs-library.repo';

const held = vi.hoisted(() => ({
  stores: new Map<string, Map<unknown, unknown>>(),
  blobs: new Map<string, Blob>(),
}));

function store(name: string): Map<unknown, unknown> {
  const found = held.stores.get(name);
  if (found !== undefined) return found;
  const created = new Map<unknown, unknown>();
  held.stores.set(name, created);
  return created;
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  listRecords: (_db: unknown, name: string) => Promise.resolve([...store(name).values()]),
  getRecord: (_db: unknown, name: string, key: unknown) => Promise.resolve(store(name).get(key)),
  putRecord: (_db: unknown, name: string, row: { id: unknown }) => {
    store(name).set(row.id, row);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, name: string, key: unknown) => {
    store(name).delete(key);
    return Promise.resolve();
  },
}));

vi.mock('$lib/platform/opfs/blob-store', () => ({
  isAvailable: () => true,
  get: (key: string) => Promise.resolve(held.blobs.get(key) ?? null),
  put: (key: string, blob: Blob) => {
    held.blobs.set(key, blob);
    return Promise.resolve();
  },
  remove: (key: string) => {
    held.blobs.delete(key);
    return Promise.resolve();
  },
  totalBytes: () => Promise.resolve(0),
}));

const GOOD: StoredBook = {
  id: bookId('good-1'),
  title: 'Yotsuba&! 1',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'width',
  sourceKind: 'archive',
  contentHash: contentHash('9f86d081'),
  fileName: 'Yotsuba&! 1.cbz',
  imageCount: 182,
  addedAt: 1758240000000,
  position: imagePlace(imageIndex(3)),
  lastReadAt: null,
  finishedAt: null,
};

const OLD_SHAPE = {
  id: 'old-1',
  title: 'Yotsuba&! 2',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  sourceKind: 'archive',
  imageCount: 190,
  addedAt: 1758240000001,
  position: 45,
};

beforeEach(() => {
  held.stores.clear();
  held.blobs.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createLibraryRepository', () => {
  it('lists the rows that read and reports an old-shape row as unreadable with its id and title', async () => {
    store('books').set(GOOD.id, GOOD);
    store('books').set(OLD_SHAPE.id, OLD_SHAPE);

    const listed = await createLibraryRepository().list();

    expect(listed.kind === 'success' && listed.books.map((book) => book.id)).toEqual(['good-1']);
    expect(listed.kind === 'success' && listed.unreadable).toEqual([
      { id: 'old-1', title: 'Yotsuba&! 2' },
    ]);
  });

  it('removes an unreadable row by its id with its page list and files, and reads nothing first', async () => {
    store('books').set(OLD_SHAPE.id, OLD_SHAPE);
    store('page-lists').set(OLD_SHAPE.id, { id: OLD_SHAPE.id, names: ['a.jpg'] });
    held.blobs.set('old-1.src', new Blob(['source']));
    held.blobs.set('old-1.cover', new Blob(['cover']));
    const repository = createLibraryRepository();

    const removed = await repository.remove(bookId('old-1'));
    const listed = await repository.list();

    expect(removed).toEqual({ kind: 'success' });
    expect(store('books').size).toBe(0);
    expect(store('page-lists').size).toBe(0);
    expect(held.blobs.size).toBe(0);
    expect(listed).toEqual({ kind: 'success', books: [], unreadable: [] });
  });
});
