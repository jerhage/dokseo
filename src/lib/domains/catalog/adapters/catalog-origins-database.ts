import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'catalog-origins';

const DATABASE_VERSION = 1;

const CATALOG_STORE = 'catalogs';

const ORIGIN_STORE = 'origins';

const ORIGIN_CATALOG_INDEX = 'catalogId';

const ORIGIN_ENTRY_INDEX = 'entry';

function upgrade(db: IDBDatabase, upgrading: IDBTransaction): void {
  if (!db.objectStoreNames.contains(CATALOG_STORE)) {
    db.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
  }

  const origins = db.objectStoreNames.contains(ORIGIN_STORE)
    ? upgrading.objectStore(ORIGIN_STORE)
    : db.createObjectStore(ORIGIN_STORE, { keyPath: 'bookId' });
  if (!origins.indexNames.contains(ORIGIN_CATALOG_INDEX)) {
    origins.createIndex(ORIGIN_CATALOG_INDEX, 'catalogId', { unique: false });
  }
  if (!origins.indexNames.contains(ORIGIN_ENTRY_INDEX)) {
    origins.createIndex(ORIGIN_ENTRY_INDEX, ['catalogId', 'entryId'], {
      unique: true,
    });
  }
}

let connection: Promise<IDBDatabase> | null = null;

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function catalogOriginsDatabase(): Promise<IDBDatabase> {
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
  CATALOG_STORE,
  ORIGIN_STORE,
  ORIGIN_CATALOG_INDEX,
  ORIGIN_ENTRY_INDEX,
  DATABASE_NAME,
  DATABASE_VERSION,
  recordsAvailable,
  catalogOriginsDatabase,
  upgrade,
};
