import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import { imagePlace } from '$lib/shared/reading-place';
import { bookFromStored } from '../domain/book/stored-book';
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
      { id: 'old-1', title: 'Yotsuba&! 2', alias: null, contentHash: '', fileName: '' },
    ]);
  });

  it('removes an unreadable row by its id with its page list and files', async () => {
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

  it('keeps a removed record with the title, hash and file name of a book it removes', async () => {
    store('books').set(GOOD.id, GOOD);
    const repository = createLibraryRepository();

    await repository.remove(bookId('good-1'));
    const removed = await repository.listRemoved();

    expect(removed).toEqual({
      kind: 'success',
      removed: [
        {
          id: 'good-1',
          title: 'Yotsuba&! 1',
          alias: null,
          contentHash: '9f86d081',
          fileName: 'Yotsuba&! 1.cbz',
          language: 'ja',
          direction: 'rtl',
          addedAt: 1758240000000,
        },
      ],
    });
  });

  it('stores a rename as the alias and keeps the original title in the row', async () => {
    store('books').set(GOOD.id, GOOD);
    const repository = createLibraryRepository();

    await repository.update(bookId('good-1'), { alias: 'Mine' });

    expect(store('books').get('good-1')).toMatchObject({ title: 'Yotsuba&! 1', alias: 'Mine' });
  });

  it('keeps the alias of a book it removes in the removed record', async () => {
    store('books').set(GOOD.id, { ...GOOD, alias: 'Mine' });
    const repository = createLibraryRepository();

    await repository.remove(bookId('good-1'));
    const removed = await repository.listRemoved();

    expect(removed.kind === 'success' && removed.removed[0]).toMatchObject({
      title: 'Yotsuba&! 1',
      alias: 'Mine',
    });
  });

  it('keeps a removed record read from the raw fields of an unreadable row', async () => {
    store('books').set(OLD_SHAPE.id, { ...OLD_SHAPE, fileName: 'Yotsuba&! 2.cbz' });
    const repository = createLibraryRepository();

    await repository.remove(bookId('old-1'));
    const removed = await repository.listRemoved();

    expect(removed).toEqual({
      kind: 'success',
      removed: [
        {
          id: 'old-1',
          title: 'Yotsuba&! 2',
          alias: null,
          contentHash: '',
          fileName: 'Yotsuba&! 2.cbz',
          language: 'ja',
          direction: 'rtl',
          addedAt: 1758240000001,
        },
      ],
    });
  });

  it('offers removed records and unreadable rows as restorable, and no readable book', async () => {
    store('books').set(GOOD.id, GOOD);
    store('books').set(OLD_SHAPE.id, OLD_SHAPE);
    store('removed-books').set('gone-1', { id: 'gone-1', title: 'Gone', contentHash: 'abc' });

    const restorable = await createLibraryRepository().listRestorable();

    expect(restorable.kind === 'success' && restorable.removed.map((book) => book.id)).toEqual([
      'gone-1',
    ]);
    expect(restorable.kind === 'success' && restorable.unreadable.map((book) => book.id)).toEqual([
      'old-1',
    ]);
  });

  it('forgets the removed record and the stale page list of an id it adds a book under', async () => {
    store('books').set(OLD_SHAPE.id, OLD_SHAPE);
    store('page-lists').set(OLD_SHAPE.id, { id: OLD_SHAPE.id, names: ['a.jpg'] });
    store('removed-books').set(OLD_SHAPE.id, { id: OLD_SHAPE.id, title: 'Yotsuba&! 2' });
    held.blobs.set('old-1.cover', new Blob(['old cover']));
    const repository = createLibraryRepository();

    await repository.add(
      bookFromStored({ ...GOOD, id: 'old-1' }),
      new Blob(['source']),
      null,
      INTRINSIC_ORDER,
      () => undefined,
    );
    const listed = await repository.list();

    expect(listed.kind === 'success' && listed.books.map((book) => book.id)).toEqual(['old-1']);
    expect(store('removed-books').size).toBe(0);
    expect(store('page-lists').size).toBe(0);
    expect(held.blobs.has('old-1.cover')).toBe(false);
  });

  it('forgets a removed record by its id', async () => {
    store('removed-books').set('gone-1', { id: 'gone-1', title: 'Gone' });
    const repository = createLibraryRepository();

    await repository.forgetRemoved(bookId('gone-1'));

    expect(store('removed-books').size).toBe(0);
  });
});
