import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CATALOG_ORIGINS_DATABASE,
  layoutOf,
} from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import { bookId, catalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { BookOrigin } from '../domain/book-origin';
import type { Catalog } from '../domain/catalog';
import { createCatalogOriginsRepository } from './indexeddb-catalog-origins.repo';

type Row = { readonly [field: string]: unknown };

type FakeWrite =
  | { readonly kind: 'put'; readonly store: string; readonly record: Row }
  | { readonly kind: 'delete'; readonly store: string; readonly key: unknown };

const fake = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  stores: new Map<string, Map<unknown, Row>>(),
}));

function store(name: string): Map<unknown, Row> {
  const found = fake.stores.get(name);
  if (found !== undefined) return found;
  const created = new Map<unknown, Row>();
  fake.stores.set(name, created);
  return created;
}

function keyPathOf(name: string): string {
  return name === 'origins' ? 'bookId' : 'id';
}

function indexKey(index: string, row: Row): string {
  if (index === 'entry') return JSON.stringify([row['catalogId'], row['entryId']]);
  return JSON.stringify(row['catalogId']);
}

function putChecked(name: string, record: Row): void {
  if (name === 'origins') {
    for (const [key, other] of store(name)) {
      if (key !== record['bookId'] && indexKey('entry', other) === indexKey('entry', record)) {
        throw new Error('ConstraintError');
      }
    }
  }
  store(name).set(record[keyPathOf(name)], record);
}

function matching(name: string, index: string, key: unknown): Row[] {
  return [...store(name).values()].filter((row) => indexKey(index, row) === JSON.stringify(key));
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    fake.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
  listRecords: (_db: unknown, name: string) => Promise.resolve([...store(name).values()]),
  getRecord: (_db: unknown, name: string, key: unknown) => Promise.resolve(store(name).get(key)),
  putRecord: (_db: unknown, name: string, record: Row) => {
    putChecked(name, record);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, name: string, key: unknown) => {
    store(name).delete(key);
    return Promise.resolve();
  },
  listByIndex: (_db: unknown, name: string, index: string, key: unknown) =>
    Promise.resolve(matching(name, index, key)),
  deleteByIndex: (_db: unknown, name: string, index: string, key: unknown) => {
    for (const row of matching(name, index, key)) store(name).delete(row[keyPathOf(name)]);
    return Promise.resolve();
  },
  writeRecords: (_db: unknown, writes: readonly FakeWrite[]) => {
    for (const write of writes) {
      if (write.kind === 'put') putChecked(write.store, write.record);
      else store(write.store).delete(write.key);
    }
    return Promise.resolve();
  },
}));

const ACQUISITION = {
  href: 'https://books.example/get/epub/1',
  format: 'epub',
  mediaType: 'application/epub+zip',
  length: 1024,
} as const;

function catalog(id: string, auth: Catalog['auth'] = { kind: 'none' }): Catalog {
  return {
    id: catalogId(id),
    title: `Title ${id}`,
    protocol: 'opds1' as const,
    rootUrl: `https://${id}.example/opds`,
    auth,
  };
}

function origin(book: string, owner: string, entry: string): BookOrigin {
  return {
    bookId: bookId(book),
    catalogId: catalogId(owner),
    entryId: entry,
    acquisition: ACQUISITION,
    updated: '2026-10-01T00:00:00Z',
    feedPath: [{ title: 'Newest', href: 'https://books.example/opds/new' }],
    feedPosition: 3,
    downloadedAt: 1_760_000_000_000,
  };
}

beforeEach(() => {
  fake.opened.length = 0;
  fake.stores.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCatalogOriginsRepository', () => {
  it('round-trips a catalog through save, get, list and remove', async () => {
    const repository = createCatalogOriginsRepository();
    const calibre = catalog('calibre', { kind: 'basic', username: 'reader' });

    expect(await repository.save(calibre)).toEqual({ kind: 'success' });
    expect(await repository.get(calibre.id)).toEqual({
      kind: 'success',
      catalog: calibre,
    });
    expect(await repository.list()).toEqual({
      kind: 'success',
      catalogs: [calibre],
      unreadable: [],
    });
    expect(await repository.remove(calibre.id)).toEqual({ kind: 'success' });
    expect(await repository.get(calibre.id)).toEqual({
      kind: 'success',
      catalog: null,
    });
  });

  it('writes no password into a catalog row', async () => {
    const wider = {
      kind: 'basic',
      username: 'reader',
      password: 'hunter2',
    } as const;

    await createCatalogOriginsRepository().save(catalog('calibre', wider));

    const row = store('catalogs').get('calibre');
    expect(row?.['auth']).toEqual({ kind: 'basic', username: 'reader' });
    expect(JSON.stringify(row)).not.toContain('hunter2');
  });

  it('reports a damaged catalog row as unreadable and lists the others', async () => {
    const repository = createCatalogOriginsRepository();
    await repository.save(catalog('calibre'));
    store('catalogs').set('broken', { id: 'broken', title: 'Broken' });

    const listed = await repository.list();
    const looked = await repository.get(catalogId('broken'));

    expect(listed).toEqual({
      kind: 'success',
      catalogs: [catalog('calibre')],
      unreadable: [{ id: 'broken', stored: { id: 'broken', title: 'Broken' } }],
    });
    expect(looked).toEqual({ kind: 'unreadable', id: 'broken' });
  });

  it('round-trips an origin through put, find, list and deleteByBook', async () => {
    const repository = createCatalogOriginsRepository();
    const recorded = origin('book-1', 'calibre', 'urn:uuid:1');

    expect(await repository.put(recorded)).toEqual({ kind: 'success' });
    expect(await repository.find(recorded.catalogId, 'urn:uuid:1')).toEqual({
      kind: 'success',
      origin: recorded,
    });
    expect(await repository.listAll()).toEqual({
      kind: 'success',
      origins: [recorded],
      unreadable: [],
    });
    expect(await repository.listByCatalog(recorded.catalogId)).toEqual({
      kind: 'success',
      origins: [recorded],
      unreadable: [],
    });
    expect(await repository.deleteByBook(recorded.bookId)).toEqual({
      kind: 'success',
    });
    expect(await repository.find(recorded.catalogId, 'urn:uuid:1')).toEqual({
      kind: 'success',
      origin: null,
    });
  });

  it('replaces the origin of an entry when another book is recorded for it', async () => {
    const repository = createCatalogOriginsRepository();
    await repository.put(origin('book-1', 'calibre', 'urn:uuid:1'));

    await repository.put(origin('book-2', 'calibre', 'urn:uuid:1'));

    const listed = await repository.listAll();
    expect(listed.kind === 'success' && listed.origins.map((found) => found.bookId)).toEqual([
      'book-2',
    ]);
  });

  it('keeps the same entry id apart across catalogs', async () => {
    const repository = createCatalogOriginsRepository();
    await repository.put(origin('book-1', 'calibre', 'urn:uuid:1'));
    await repository.put(origin('book-2', 'other', 'urn:uuid:1'));

    const listed = await repository.listAll();

    expect(listed.kind === 'success' && listed.origins).toHaveLength(2);
  });

  it('deletes only the origins of the named catalog', async () => {
    const repository = createCatalogOriginsRepository();
    await repository.put(origin('book-1', 'calibre', 'urn:uuid:1'));
    await repository.put(origin('book-2', 'calibre', 'urn:uuid:2'));
    await repository.put(origin('book-3', 'other', 'urn:uuid:1'));

    await repository.deleteByCatalog(catalogId('calibre'));

    const listed = await repository.listAll();
    expect(listed.kind === 'success' && listed.origins.map((found) => found.bookId)).toEqual([
      'book-3',
    ]);
  });

  it('reports a damaged origin row as unreadable and lists the others', async () => {
    const repository = createCatalogOriginsRepository();
    await repository.put(origin('book-1', 'calibre', 'urn:uuid:1'));
    const damaged = {
      bookId: 'book-2',
      catalogId: 'calibre',
      entryId: 'urn:uuid:2',
    };
    store('origins').set('book-2', damaged);

    const listed = await repository.listByCatalog(catalogId('calibre'));
    const looked = await repository.find(catalogId('calibre'), 'urn:uuid:2');

    expect(listed.kind === 'success' && listed.origins).toHaveLength(1);
    expect(listed.kind === 'success' && listed.unreadable).toEqual([
      { bookId: 'book-2', stored: damaged },
    ]);
    expect(looked).toEqual({ kind: 'unreadable', bookId: 'book-2' });
  });

  it('answers storage unavailable on every call when IndexedDB is missing', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('indexedDB', undefined);
    const repository = createCatalogOriginsRepository();

    expect(await repository.list()).toEqual(STORAGE_UNAVAILABLE);
    expect(await repository.save(catalog('calibre'))).toEqual(STORAGE_UNAVAILABLE);
    expect(await repository.put(origin('book-1', 'calibre', 'urn:uuid:1'))).toEqual(
      STORAGE_UNAVAILABLE,
    );
    expect(await repository.deleteByCatalog(catalogId('calibre'))).toEqual(STORAGE_UNAVAILABLE);
  });

  it('declares catalog-origins at version 1 with the two stores and both origin indexes', async () => {
    vi.resetModules();
    const fresh = await import('./indexeddb-catalog-origins.repo');
    await fresh.createCatalogOriginsRepository().list();

    const [opened] = fake.opened;
    expect(opened && layoutOf(opened)).toEqual(CATALOG_ORIGINS_DATABASE);
  });
});
