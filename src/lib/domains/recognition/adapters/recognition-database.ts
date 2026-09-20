import { openDatabase } from '$lib/platform/idb/connection';

const DATABASE_NAME = 'recognition';

const DATABASE_VERSION = 3;

export const CONSENT_STORE = 'model-consent';

export const CAPTURE_STORE = 'captures';

export const CAPTURE_BOOK_INDEX = 'bookId';

export const SETUP_STORE = 'recognizer-setup';

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(CONSENT_STORE)) {
    db.createObjectStore(CONSENT_STORE, { keyPath: 'language' });
  }

  if (!db.objectStoreNames.contains(CAPTURE_STORE)) {
    const captures = db.createObjectStore(CAPTURE_STORE, { keyPath: 'id' });
    captures.createIndex(CAPTURE_BOOK_INDEX, 'bookId', { unique: false });
  }

  if (!db.objectStoreNames.contains(SETUP_STORE)) {
    db.createObjectStore(SETUP_STORE, { keyPath: 'language' });
  }
}

let connection: Promise<IDBDatabase> | null = null;

export function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function recognitionDatabase(): Promise<IDBDatabase> {
  if (connection === null) {
    const opening = openDatabase(DATABASE_NAME, DATABASE_VERSION, upgrade);
    opening.catch(() => {
      connection = null;
    });
    connection = opening;
  }
  return connection;
}
