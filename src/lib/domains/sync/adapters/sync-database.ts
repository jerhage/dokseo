import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'sync';

const DATABASE_VERSION = 3;

const SETTINGS_STORE = 'settings';

const HELD_CHANGES_STORE = 'held-changes';

const TRIED_DOWNLOADS_STORE = 'tried-downloads';

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
    db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(HELD_CHANGES_STORE)) {
    db.createObjectStore(HELD_CHANGES_STORE, { keyPath: ['kind', 'recordId'] });
  }
  if (!db.objectStoreNames.contains(TRIED_DOWNLOADS_STORE)) {
    db.createObjectStore(TRIED_DOWNLOADS_STORE, { keyPath: 'contentHash' });
  }
}

let connection: Promise<IDBDatabase> | null = null;

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function syncDatabase(): Promise<IDBDatabase> {
  if (connection === null) {
    const opening = openDatabase(DATABASE_NAME, DATABASE_VERSION, upgrade);
    opening.catch(() => {
      connection = null;
    });
    connection = opening;
  }
  return connection;
}

export {
  DATABASE_NAME,
  DATABASE_VERSION,
  HELD_CHANGES_STORE,
  SETTINGS_STORE,
  TRIED_DOWNLOADS_STORE,
  recordsAvailable,
  syncDatabase,
  upgrade,
};
