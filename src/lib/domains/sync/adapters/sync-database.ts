import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'sync';

const DATABASE_VERSION = 1;

const SETTINGS_STORE = 'settings';

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
    db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
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

export { DATABASE_NAME, DATABASE_VERSION, SETTINGS_STORE, recordsAvailable, syncDatabase, upgrade };
