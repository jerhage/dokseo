import { describeCause } from '$lib/shared/cause';

function isSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function unsupported(): Error {
  return new Error('IndexedDB is unavailable in this environment');
}

export function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  if (!isSupported()) return Promise.reject(unsupported());

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => upgrade(request.result);
      request.onsuccess = () => resolve(request.result);
      request.onblocked = () =>
        reject(new Error(`Database "${name}" is blocked by another open connection`));
      request.onerror = () =>
        reject(new Error(`Database "${name}" failed to open: ${describeCause(request.error)}`));
    } catch (cause) {
      reject(new Error(`Database "${name}" failed to open: ${describeCause(cause)}`));
    }
  });
}

function transact<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  if (!isSupported()) return Promise.reject(unsupported());

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(store, mode);
      const request = run(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(
          new Error(
            `Store "${store}" aborted the transaction: ${describeCause(transaction.error)}`,
          ),
        );
      transaction.onerror = () =>
        reject(
          new Error(`Store "${store}" failed the transaction: ${describeCause(transaction.error)}`),
        );
    } catch (cause) {
      reject(new Error(`Store "${store}" is not usable: ${describeCause(cause)}`));
    }
  });
}

export function getRecord<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.get(key));
}

export async function putRecord<T>(
  db: IDBDatabase,
  store: string,
  value: T,
  key?: IDBValidKey,
): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => objectStore.put(value, key));
}

export async function deleteRecord(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => objectStore.delete(key));
}

export function listRecords<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.getAll());
}

export function listByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
): Promise<T[]> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.index(index).getAll(key));
}

export async function deleteByIndex(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => {
    const matching = objectStore.index(index).getAllKeys(key);
    matching.onsuccess = () => {
      for (const primary of matching.result) objectStore.delete(primary);
    };
    return matching;
  });
}
