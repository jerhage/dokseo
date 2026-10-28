import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'catalog-passwords';

const DATABASE_VERSION = 1;

const KEY_STORE = 'keys';

const PASSWORD_STORE = 'passwords';

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(KEY_STORE)) {
    db.createObjectStore(KEY_STORE);
  }
  if (!db.objectStoreNames.contains(PASSWORD_STORE)) {
    db.createObjectStore(PASSWORD_STORE, { keyPath: 'catalogId' });
  }
}

let connection: Promise<IDBDatabase> | null = null;

function passwordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function catalogPasswordsDatabase(): Promise<IDBDatabase> {
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
  KEY_STORE,
  PASSWORD_STORE,
  catalogPasswordsDatabase,
  passwordsAvailable,
  upgrade,
};
