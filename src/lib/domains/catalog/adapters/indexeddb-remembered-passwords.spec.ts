import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CATALOG_PASSWORDS_DATABASE,
  layoutOf,
} from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import { catalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { createIndexedDbRememberedPasswords } from './indexeddb-remembered-passwords';

type Row = { readonly [field: string]: unknown };

const fake = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  stores: new Map<string, Map<unknown, unknown>>(),
  puts: [] as { store: string; record: unknown }[],
  rivalKey: null as unknown,
}));

function store(name: string): Map<unknown, unknown> {
  const found = fake.stores.get(name);
  if (found !== undefined) return found;
  const created = new Map<unknown, unknown>();
  fake.stores.set(name, created);
  return created;
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    fake.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
  listRecords: (_db: unknown, name: string) => Promise.resolve([...store(name).values()]),
  getRecord: (_db: unknown, name: string, key: unknown) => Promise.resolve(store(name).get(key)),
  putRecord: (_db: unknown, name: string, record: Row, key?: unknown) => {
    fake.puts.push({ store: name, record });
    store(name).set(key ?? record['catalogId'], record);
    return Promise.resolve();
  },
  addRecord: (_db: unknown, name: string, value: unknown, key: unknown) => {
    if (fake.rivalKey !== null) {
      store(name).set(key, fake.rivalKey);
      fake.rivalKey = null;
    }
    if (store(name).has(key)) return Promise.resolve('exists');
    store(name).set(key, value);
    return Promise.resolve('added');
  },
  deleteRecord: (_db: unknown, name: string, key: unknown) => {
    store(name).delete(key);
    return Promise.resolve();
  },
}));

const CALIBRE = catalogId('calibre');
const OTHER = catalogId('other');

beforeEach(() => {
  fake.opened.length = 0;
  fake.stores.clear();
  fake.puts.length = 0;
  fake.rivalKey = null;
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createIndexedDbRememberedPasswords', () => {
  it('reads back a remembered password', async () => {
    const passwords = createIndexedDbRememberedPasswords();

    await passwords.remember(CALIBRE, 'secret');

    expect(await passwords.read(CALIBRE)).toEqual({ kind: 'success', password: 'secret' });
  });

  it('reads null for a catalog nothing was remembered for', async () => {
    expect(await createIndexedDbRememberedPasswords().read(CALIBRE)).toEqual({
      kind: 'success',
      password: null,
    });
  });

  it('forgets a remembered password', async () => {
    const passwords = createIndexedDbRememberedPasswords();
    await passwords.remember(CALIBRE, 'secret');

    await passwords.forget(CALIBRE);

    expect(await passwords.read(CALIBRE)).toEqual({ kind: 'success', password: null });
  });

  it('lists the catalogs that have a remembered password', async () => {
    const passwords = createIndexedDbRememberedPasswords();
    await passwords.remember(CALIBRE, 'one');
    await passwords.remember(OTHER, 'two');

    expect(await passwords.list()).toEqual({ kind: 'success', ids: new Set([CALIBRE, OTHER]) });
  });

  it('stores no row that holds the plain password', async () => {
    await createIndexedDbRememberedPasswords().remember(CALIBRE, 'secret-password');

    const rows = fake.puts.filter((put) => put.store === 'passwords');
    expect(rows).toHaveLength(1);
    const stored = rows[0]?.record;
    expect(JSON.stringify(stored)).not.toContain('secret-password');
    expect(Object.values(stored ?? {})).not.toContain('secret-password');
  });

  it('reads a row as unreadable when its key is gone', async () => {
    const passwords = createIndexedDbRememberedPasswords();
    await passwords.remember(CALIBRE, 'secret');
    store('keys').clear();

    expect(await passwords.read(CALIBRE)).toEqual({ kind: 'unreadable', id: CALIBRE });
  });

  it('seals with the stored key when another tab stored one first', async () => {
    const rival = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    fake.rivalKey = rival;
    const passwords = createIndexedDbRememberedPasswords();

    await passwords.remember(CALIBRE, 'secret');

    expect(store('keys').get('password-key')).toBe(rival);
    expect(await passwords.read(CALIBRE)).toEqual({ kind: 'success', password: 'secret' });
  });

  it('answers storage unavailable on every call when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const passwords = createIndexedDbRememberedPasswords();

    expect(await passwords.read(CALIBRE)).toEqual(STORAGE_UNAVAILABLE);
    expect(await passwords.remember(CALIBRE, 'secret')).toEqual(STORAGE_UNAVAILABLE);
    expect(await passwords.forget(CALIBRE)).toEqual(STORAGE_UNAVAILABLE);
    expect(await passwords.list()).toEqual(STORAGE_UNAVAILABLE);
  });

  it('declares catalog-passwords at version 1 with the keys and passwords stores only', async () => {
    vi.resetModules();
    const fresh = await import('./indexeddb-remembered-passwords');
    await fresh.createIndexedDbRememberedPasswords().list();

    const [opened] = fake.opened;
    expect(opened && layoutOf(opened)).toEqual(CATALOG_PASSWORDS_DATABASE);
  });
});
