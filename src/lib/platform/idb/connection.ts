import { describeCause } from '$lib/shared/cause';

function isSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function unsupported(): Error {
  return new Error('IndexedDB is unavailable in this environment');
}

const BLOCKED_PATIENCE_MS = 10_000;

type Registration = {
  readonly name: string;
  readonly version: number;
  readonly upgrade: (db: IDBDatabase) => void;
};

const connections = new Map<string, Promise<IDBDatabase>>();

const registrations = new WeakMap<IDBDatabase, Registration>();

const retired = new WeakSet<IDBDatabase>();

function failedToOpen(name: string, cause: unknown): Error {
  return new Error(`Database "${name}" failed to open: ${describeCause(cause)}`, { cause });
}

function openFailure(name: string, error: DOMException | null): Error {
  if (error?.name === 'VersionError') {
    return new Error(
      `Database "${name}" was upgraded by a newer version of the app in another tab. Reload this page to keep going.`,
    );
  }
  return failedToOpen(name, error);
}

function heldByAnotherTab(name: string): Error {
  return new Error(
    `Database "${name}" is held open by another tab of the app. Close or reload the other tabs, then try again.`,
  );
}

function forget(name: string, opening: Promise<IDBDatabase>): void {
  if (connections.get(name) === opening) connections.delete(name);
}

function watchConnection(db: IDBDatabase, registration: Registration, retire: () => void): void {
  registrations.set(db, registration);
  const release = () => {
    retired.add(db);
    retire();
  };
  db.onversionchange = () => {
    db.close();
    release();
  };
  db.onclose = release;
}

function openConnection(registration: Registration, retire: () => void): Promise<IDBDatabase> {
  const { name, version, upgrade } = registration;

  return new Promise((resolve, reject) => {
    let abandoned = false;
    let patience: ReturnType<typeof setTimeout> | undefined;
    const stopWaiting = () => clearTimeout(patience);

    try {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => upgrade(request.result);
      request.onsuccess = () => {
        stopWaiting();
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        watchConnection(db, registration, retire);
        resolve(db);
      };
      request.onblocked = () => {
        stopWaiting();
        patience = setTimeout(() => {
          abandoned = true;
          reject(heldByAnotherTab(name));
        }, BLOCKED_PATIENCE_MS);
      };
      request.onerror = () => {
        stopWaiting();
        reject(openFailure(name, request.error));
      };
    } catch (cause) {
      reject(failedToOpen(name, cause));
    }
  });
}

function connect(registration: Registration): Promise<IDBDatabase> {
  const held = connections.get(registration.name);
  if (held !== undefined) return held;

  const opening = openConnection(registration, () => forget(registration.name, opening));
  connections.set(registration.name, opening);
  opening.catch(() => forget(registration.name, opening));
  return opening;
}

function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  if (!isSupported()) return Promise.reject(unsupported());
  return connect({ name, version, upgrade });
}

function current(db: IDBDatabase): Promise<IDBDatabase> {
  const registration = registrations.get(db);
  if (registration === undefined || !retired.has(db)) return Promise.resolve(db);
  return connect(registration);
}

async function transact<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  if (!isSupported()) throw unsupported();

  const live = await current(db);

  return new Promise((resolve, reject) => {
    try {
      const transaction = live.transaction(store, mode);
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
      reject(new Error(`Store "${store}" is not usable: ${describeCause(cause)}`, { cause }));
    }
  });
}

function getRecord<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.get(key));
}

async function putRecord<T>(
  db: IDBDatabase,
  store: string,
  value: T,
  key?: IDBValidKey,
): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => objectStore.put(value, key));
}

async function deleteRecord(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => objectStore.delete(key));
}

function listRecords<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.getAll());
}

function listByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
): Promise<T[]> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.index(index).getAll(key));
}

async function deleteByIndex(
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

async function rewriteByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
  rewrite: (record: T) => T,
): Promise<void> {
  await transact(db, store, 'readwrite', (objectStore) => {
    const matching = objectStore.index(index).getAll(key);
    matching.onsuccess = () => {
      for (const record of matching.result) objectStore.put(rewrite(record));
    };
    return matching;
  });
}

export {
  BLOCKED_PATIENCE_MS,
  openDatabase,
  getRecord,
  putRecord,
  deleteRecord,
  listRecords,
  listByIndex,
  deleteByIndex,
  rewriteByIndex,
};
