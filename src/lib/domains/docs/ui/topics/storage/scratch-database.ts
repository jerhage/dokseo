const SCRATCH_DATABASE = 'dokseo-docs-scratch';

const SCRATCH_VERSION = 1;

const SCRATCH_STORE = 'notes';

type ScratchNote = { readonly id: number; readonly text: string; readonly savedAt: number };

type DatabaseListing = { readonly name: string; readonly version: number };

type ScratchOpening = { readonly kind: 'created' | 'opened'; readonly version: number };

type ScratchDatabaseStore = {
  databases(): Promise<readonly DatabaseListing[] | null>;
  open(): Promise<ScratchOpening>;
  add(text: string, savedAt: number): Promise<void>;
  notes(): Promise<readonly ScratchNote[]>;
  remove(): Promise<void>;
};

function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openScratch(): Promise<{ db: IDBDatabase; opening: ScratchOpening }> {
  return new Promise((resolve, reject) => {
    let kind: ScratchOpening['kind'] = 'opened';
    const request = indexedDB.open(SCRATCH_DATABASE, SCRATCH_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SCRATCH_STORE, { keyPath: 'id', autoIncrement: true });
      kind = 'created';
    };
    request.onsuccess = () => {
      const db = request.result;
      resolve({ db, opening: { kind, version: db.version } });
    };
    request.onerror = () => reject(request.error);
  });
}

async function withScratch<T>(work: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const { db } = await openScratch();
  try {
    return await work(db);
  } finally {
    db.close();
  }
}

function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
}

function isScratchNote(value: unknown): value is ScratchNote {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'savedAt' in value &&
    typeof value.savedAt === 'number'
  );
}

async function listedDatabases(): Promise<readonly DatabaseListing[] | null> {
  if (typeof indexedDB.databases !== 'function') return null;
  const listed = await indexedDB.databases();
  return listed.flatMap((info) =>
    info.name === undefined ? [] : [{ name: info.name, version: info.version ?? 0 }],
  );
}

function createScratchDatabaseStore(): ScratchDatabaseStore {
  return {
    databases: listedDatabases,
    async open() {
      const { db, opening } = await openScratch();
      db.close();
      return opening;
    },
    add: (text, savedAt) =>
      withScratch(async (db) => {
        const transaction = db.transaction(SCRATCH_STORE, 'readwrite');
        transaction.objectStore(SCRATCH_STORE).add({ text, savedAt });
        await committed(transaction);
      }),
    notes: () =>
      withScratch(async (db) => {
        const rows = await settled(
          db.transaction(SCRATCH_STORE, 'readonly').objectStore(SCRATCH_STORE).getAll(),
        );
        return rows.filter(isScratchNote);
      }),
    remove: () => settled(indexedDB.deleteDatabase(SCRATCH_DATABASE)).then(() => undefined),
  };
}

export { SCRATCH_DATABASE, SCRATCH_STORE, SCRATCH_VERSION, createScratchDatabaseStore };
export type { DatabaseListing, ScratchDatabaseStore, ScratchNote, ScratchOpening };
