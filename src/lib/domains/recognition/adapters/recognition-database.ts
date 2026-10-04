import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'recognition';

const DATABASE_VERSION = 5;

const CONSENT_STORE = 'model-consent';

const CAPTURE_STORE = 'captures';

const CAPTURE_BOOK_INDEX = 'bookId';

const CAPTURE_TAG_INDEX = 'tagIds';

const SETUP_STORE = 'recognizer-setup';

const TAG_STORE = 'tags';

function capturesStore(db: IDBDatabase, upgrading: IDBTransaction): IDBObjectStore {
  if (db.objectStoreNames.contains(CAPTURE_STORE)) return upgrading.objectStore(CAPTURE_STORE);
  return db.createObjectStore(CAPTURE_STORE, { keyPath: 'id' });
}

function upgrade(db: IDBDatabase, upgrading: IDBTransaction): void {
  if (!db.objectStoreNames.contains(CONSENT_STORE)) {
    db.createObjectStore(CONSENT_STORE, { keyPath: 'language' });
  }

  const captures = capturesStore(db, upgrading);
  if (!captures.indexNames.contains(CAPTURE_BOOK_INDEX)) {
    captures.createIndex(CAPTURE_BOOK_INDEX, 'bookId', { unique: false });
  }
  if (!captures.indexNames.contains(CAPTURE_TAG_INDEX)) {
    captures.createIndex(CAPTURE_TAG_INDEX, 'tagIds', { unique: false, multiEntry: true });
  }

  if (!db.objectStoreNames.contains(SETUP_STORE)) {
    db.createObjectStore(SETUP_STORE, { keyPath: 'language' });
  }

  if (!db.objectStoreNames.contains(TAG_STORE)) {
    db.createObjectStore(TAG_STORE, { keyPath: 'id' });
  }
}

let connection: Promise<IDBDatabase> | null = null;

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function recognitionDatabase(): Promise<IDBDatabase> {
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
  CONSENT_STORE,
  CAPTURE_STORE,
  CAPTURE_BOOK_INDEX,
  CAPTURE_TAG_INDEX,
  SETUP_STORE,
  TAG_STORE,
  recordsAvailable,
  recognitionDatabase,
  upgrade,
};
