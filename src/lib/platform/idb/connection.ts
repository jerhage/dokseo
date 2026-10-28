import { describeCause } from '$lib/shared/cause';
import {
  OUTBOX_STORE,
  RECORD_VERSION_STORE,
  isLaterVersion,
  markChanged,
} from '$lib/shared/change-marker';
import type { ChangeMarker, HeldVersion, SettledMarker } from '$lib/shared/change-marker';
import { announceLocalChange } from '../events/local-change';

function isSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function unsupported(): Error {
  return new Error('IndexedDB is unavailable in this environment');
}

const BLOCKED_PATIENCE_MS = 10_000;

type Upgrade = (db: IDBDatabase, upgrading: IDBTransaction) => void;

type Registration = {
  readonly name: string;
  readonly version: number;
  readonly upgrade: Upgrade;
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
      request.onupgradeneeded = () => {
        const upgrading = request.transaction;
        if (upgrading === null) throw new Error(`Database "${name}" opened no upgrade transaction`);
        upgrade(request.result, upgrading);
      };
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

function openDatabase(name: string, version: number, upgrade: Upgrade): Promise<IDBDatabase> {
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

type RecordWrite =
  | { readonly kind: 'put'; readonly store: string; readonly record: unknown }
  | { readonly kind: 'delete'; readonly store: string; readonly key: IDBValidKey }
  | { readonly kind: 'mark'; readonly marker: ChangeMarker };

type MarkerFor = (primaryKey: IDBValidKey) => ChangeMarker | null;

type RecordRead = { readonly store: string; readonly key: IDBValidKey };

const marking = new WeakSet<IDBTransaction>();

function mark(transaction: IDBTransaction, marker: ChangeMarker): void {
  markChanged(transaction, marker);
  marking.add(transaction);
}

function storeOf(write: RecordWrite): string {
  return write.kind === 'mark' ? OUTBOX_STORE : write.store;
}

function place(transaction: IDBTransaction, write: RecordWrite): void {
  if (write.kind === 'mark') {
    mark(transaction, write.marker);
    return;
  }
  const objectStore = transaction.objectStore(write.store);
  if (write.kind === 'put') objectStore.put(write.record);
  else objectStore.delete(write.key);
}

async function transactAcross(
  db: IDBDatabase,
  stores: readonly string[],
  run: (transaction: IDBTransaction) => void,
): Promise<void> {
  if (!isSupported()) throw unsupported();

  const live = await current(db);
  const named = stores.join('", "');

  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction | null = null;
    try {
      const opened = live.transaction([...stores], 'readwrite');
      transaction = opened;
      opened.oncomplete = () => {
        if (marking.has(opened)) announceLocalChange();
        resolve();
      };
      opened.onabort = () =>
        reject(
          new Error(`Stores "${named}" aborted the transaction: ${describeCause(opened.error)}`),
        );
      opened.onerror = () =>
        reject(
          new Error(`Stores "${named}" failed the transaction: ${describeCause(opened.error)}`),
        );
      run(opened);
    } catch (cause) {
      transaction?.abort();
      reject(new Error(`Stores "${named}" are not usable: ${describeCause(cause)}`, { cause }));
    }
  });
}

async function writeRecords(db: IDBDatabase, writes: readonly RecordWrite[]): Promise<void> {
  const stores = [...new Set(writes.map(storeOf))];
  await transactAcross(db, stores, (transaction) => {
    for (const write of writes) place(transaction, write);
  });
}

async function writeAfterRead<T>(
  db: IDBDatabase,
  stores: readonly string[],
  read: RecordRead,
  decide: (found: T | undefined) => readonly RecordWrite[],
): Promise<void> {
  await transactAcross(db, stores, (transaction) => {
    const reading = transaction.objectStore(read.store).get(read.key);
    reading.onsuccess = () => {
      const found: T | undefined = reading.result;
      for (const write of decide(found)) place(transaction, write);
    };
  });
}

async function settleMarkers(db: IDBDatabase, settled: readonly SettledMarker[]): Promise<void> {
  if (settled.length === 0) return;
  await transactAcross(db, [OUTBOX_STORE, RECORD_VERSION_STORE], (transaction) => {
    const outbox = transaction.objectStore(OUTBOX_STORE);
    const versions = transaction.objectStore(RECORD_VERSION_STORE);
    for (const { marker, version } of settled) {
      const key = [marker.kind, marker.recordId];
      const stored = outbox.get(key);
      stored.onsuccess = () => {
        const found: ChangeMarker | undefined = stored.result;
        if (found?.changeId === marker.changeId) outbox.delete(key);
      };
      const held = versions.get(key);
      held.onsuccess = () => {
        const heldVersion: HeldVersion | undefined = held.result;
        if (heldVersion !== undefined && !isLaterVersion(version, heldVersion)) return;
        versions.put({
          kind: marker.kind,
          recordId: marker.recordId,
          updatedAt: version.updatedAt,
          deviceId: version.deviceId,
        });
      };
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

async function addRecord<T>(
  db: IDBDatabase,
  store: string,
  value: T,
  key?: IDBValidKey,
): Promise<'added' | 'exists'> {
  let taken = false;
  await transact(db, store, 'readwrite', (objectStore) => {
    const request = objectStore.add(value, key);
    request.onerror = (event) => {
      if (request.error?.name !== 'ConstraintError') return;
      event.preventDefault();
      taken = true;
    };
    return request;
  });
  return taken ? 'exists' : 'added';
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
  markerFor?: MarkerFor,
): Promise<void> {
  if (markerFor !== undefined) {
    await transactAcross(db, [store, OUTBOX_STORE], (transaction) => {
      const objectStore = transaction.objectStore(store);
      const matching = objectStore.index(index).getAllKeys(key);
      matching.onsuccess = () => {
        for (const primary of matching.result) {
          objectStore.delete(primary);
          const marker = markerFor(primary);
          if (marker !== null) mark(transaction, marker);
        }
      };
    });
    return;
  }
  await transact(db, store, 'readwrite', (objectStore) => {
    const matching = objectStore.index(index).getAllKeys(key);
    matching.onsuccess = () => {
      for (const primary of matching.result) objectStore.delete(primary);
    };
    return matching;
  });
}

async function deleteByIndexAndWrite(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
  writes: readonly RecordWrite[],
): Promise<void> {
  const stores = [...new Set([store, ...writes.map(storeOf)])];
  await transactAcross(db, stores, (transaction) => {
    const objectStore = transaction.objectStore(store);
    const matching = objectStore.index(index).getAllKeys(key);
    matching.onsuccess = () => {
      for (const primary of matching.result) objectStore.delete(primary);
    };
    for (const write of writes) place(transaction, write);
  });
}

async function rewriteByIndexAndWrite<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
  rewrite: (record: T) => T | null,
  writes: readonly RecordWrite[],
): Promise<void> {
  const stores = [...new Set([store, ...writes.map(storeOf)])];
  await transactAcross(db, stores, (transaction) => {
    const objectStore = transaction.objectStore(store);
    const matching = objectStore.index(index).getAll(key);
    matching.onsuccess = () => {
      for (const before of matching.result) {
        const after = rewrite(before);
        if (after !== null) objectStore.put(after);
      }
    };
    for (const write of writes) place(transaction, write);
  });
}

async function rewriteByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
  rewrite: (record: T) => T,
  markerFor?: (before: T, after: T) => ChangeMarker | null,
): Promise<void> {
  if (markerFor !== undefined) {
    await transactAcross(db, [store, OUTBOX_STORE], (transaction) => {
      const objectStore = transaction.objectStore(store);
      const matching = objectStore.index(index).getAll(key);
      matching.onsuccess = () => {
        for (const before of matching.result) {
          const after = rewrite(before);
          objectStore.put(after);
          const marker = markerFor(before, after);
          if (marker !== null) mark(transaction, marker);
        }
      };
    });
    return;
  }
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
  addRecord,
  deleteRecord,
  listRecords,
  listByIndex,
  deleteByIndex,
  deleteByIndexAndWrite,
  rewriteByIndex,
  rewriteByIndexAndWrite,
  writeRecords,
  writeAfterRead,
  settleMarkers,
};
export type { MarkerFor, RecordRead, RecordWrite };
