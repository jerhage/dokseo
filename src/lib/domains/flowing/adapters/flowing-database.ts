import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'flowing';

const DATABASE_VERSION = 1;

const READING_SETTINGS_STORE = 'reading-settings';

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(READING_SETTINGS_STORE)) {
    db.createObjectStore(READING_SETTINGS_STORE, { keyPath: 'reader' });
  }
}

let connection: Promise<IDBDatabase> | null = null;

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function flowingDatabase(): Promise<IDBDatabase> {
  if (connection === null) {
    const opening = openDatabase(DATABASE_NAME, DATABASE_VERSION, upgrade);
    opening.catch(() => {
      connection = null;
    });
    connection = opening;
  }
  return connection;
}

export { flowingDatabase, READING_SETTINGS_STORE, recordsAvailable };
