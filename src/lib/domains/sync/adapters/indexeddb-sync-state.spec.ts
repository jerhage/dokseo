import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYNC_DATABASE, layoutOf } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { SyncConnection } from '../domain/sync-state';
import { createSyncStateStore } from './indexeddb-sync-state';

type Row = { readonly [field: string]: unknown };

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

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    fake.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
  getRecord: (_db: unknown, name: string, key: unknown) => Promise.resolve(store(name).get(key)),
  putRecord: (_db: unknown, name: string, record: Row) => {
    store(name).set(record['id'], record);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, name: string, key: unknown) => {
    store(name).delete(key);
    return Promise.resolve();
  },
}));

const CONNECTION: SyncConnection = {
  serverUrl: 'https://sync.example/sync/',
  deviceId: '00000000-0000-4000-8000-000000000002',
  deviceName: 'Laptop',
  token: 'dsk_3f9a1c7e5b2d4a60',
  cursor: 12,
  lastSyncAt: 1772446000000,
  autoDownload: false,
};

beforeEach(() => {
  fake.opened.length = 0;
  fake.stores.clear();
  vi.stubGlobal('indexedDB', {});
});

describe('the sync state store', () => {
  it('reads no connection before one is written', async () => {
    expect(await createSyncStateStore().read()).toEqual({ kind: 'success', connection: null });
  });

  it('reads back the connection it wrote', async () => {
    const states = createSyncStateStore();

    await states.write(CONNECTION);

    expect(await states.read()).toEqual({ kind: 'success', connection: CONNECTION });
  });

  it('keeps one row, so a second write replaces the first', async () => {
    const states = createSyncStateStore();

    await states.write(CONNECTION);
    await states.write({ ...CONNECTION, cursor: 30 });

    expect(store('settings').size).toBe(1);
    expect(await states.read()).toEqual({
      kind: 'success',
      connection: { ...CONNECTION, cursor: 30 },
    });
  });

  it('reads no connection after clearing', async () => {
    const states = createSyncStateStore();
    await states.write(CONNECTION);

    await states.clear();

    expect(await states.read()).toEqual({ kind: 'success', connection: null });
  });

  it('reads no connection from a row that lacks its token', async () => {
    store('settings').set('connection', { id: 'connection', serverUrl: 'https://x.example/' });

    expect(await createSyncStateStore().read()).toEqual({ kind: 'success', connection: null });
  });

  it('answers storage unavailable on every call when IndexedDB is missing', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('indexedDB', undefined);
    const states = createSyncStateStore();

    expect(await states.read()).toEqual(STORAGE_UNAVAILABLE);
    expect(await states.write(CONNECTION)).toEqual(STORAGE_UNAVAILABLE);
    expect(await states.clear()).toEqual(STORAGE_UNAVAILABLE);
  });

  it('declares the sync database at version 3 with the settings, held-changes and tried-downloads stores', async () => {
    vi.resetModules();
    const fresh = await import('./indexeddb-sync-state');
    await fresh.createSyncStateStore().read();

    const [opened] = fake.opened;
    expect(opened && layoutOf(opened)).toEqual(SYNC_DATABASE);
  });
});
