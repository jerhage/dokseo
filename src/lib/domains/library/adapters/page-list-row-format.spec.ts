import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layoutOf, READER_DATABASE } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import { PAGE_LIST_ROW, PAGED_BOOK_ROW } from '$lib/shared/testing/stored-format/library-rows';
import {
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { bookId } from '$lib/shared/ids';
import { pageListFromStored } from '../domain/book/page-list';
import { bookFromStored } from '../domain/book/stored-book';
import { createLibraryRepository } from './indexeddb-opfs-library.repo';

const held = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  stores: new Map<string, Map<unknown, unknown>>(),
}));

function store(name: string): Map<unknown, unknown> {
  const found = held.stores.get(name);
  if (found !== undefined) return found;
  const created = new Map<unknown, unknown>();
  held.stores.set(name, created);
  return created;
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    held.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
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
  get: () => Promise.resolve(null),
  put: () => Promise.resolve(),
  remove: () => Promise.resolve(),
  totalBytes: () => Promise.resolve(0),
}));

const PAGE_LIST_SHAPE = { id: 'string', names: ['string', 'string', 'string', 'string'] };

const PAGE_LIST_FORMAT_CHANGED = formatChanged('a page list row');

beforeEach(() => {
  held.stores.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x page list row', () => {
  it('reads the frozen row as exactly its listed page names', () => {
    expect(pageListFromStored(PAGE_LIST_ROW), PAGE_LIST_FORMAT_CHANGED).toStrictEqual({
      kind: 'listed',
      names: PAGE_LIST_ROW.names,
    });
  });

  it('writes exactly the 1.x fields and field types when it adds a book with listed pages', async () => {
    await createLibraryRepository().add(
      bookFromStored(PAGED_BOOK_ROW),
      new Blob(['source']),
      null,
      { kind: 'listed', names: PAGE_LIST_ROW.names },
      () => undefined,
    );

    const written = store('page-lists').get(PAGE_LIST_ROW.id);
    expect(written, PAGE_LIST_FORMAT_CHANGED).toStrictEqual(PAGE_LIST_ROW);
    expect(sortedKeys(written ?? {}), PAGE_LIST_FORMAT_CHANGED).toStrictEqual(['id', 'names']);
    expect(shapeOf(written), PAGE_LIST_FORMAT_CHANGED).toStrictEqual(PAGE_LIST_SHAPE);
  });

  it('writes exactly the 1.x fields and field types when it saves a page list again', async () => {
    await createLibraryRepository().savePageList(bookId(PAGE_LIST_ROW.id), PAGE_LIST_ROW.names);

    const written = store('page-lists').get(PAGE_LIST_ROW.id);
    expect(written, PAGE_LIST_FORMAT_CHANGED).toStrictEqual(PAGE_LIST_ROW);
    expect(shapeOf(written), PAGE_LIST_FORMAT_CHANGED).toStrictEqual(PAGE_LIST_SHAPE);
  });

  it('opens the reader database at the 1.x version with the 1.x stores', async () => {
    await createLibraryRepository().readPageList(bookId(PAGE_LIST_ROW.id));

    const [opened] = held.opened;
    expect(opened && layoutOf(opened), schemaChanged('reader')).toStrictEqual(READER_DATABASE);
  });
});
