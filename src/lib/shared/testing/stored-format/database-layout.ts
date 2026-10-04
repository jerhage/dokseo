type IndexLayout = { readonly keyPath: unknown; readonly options: unknown };

type StoreLayout = {
  readonly options: unknown;
  readonly indexes: Record<string, IndexLayout>;
};

type DatabaseLayout = {
  readonly name: string;
  readonly version: number;
  readonly stores: Record<string, StoreLayout>;
};

type RecordingStore = {
  readonly indexNames: { readonly contains: (name: string) => boolean };
  readonly createIndex: (name: string, keyPath: unknown, options: unknown) => void;
};

type RecordingDatabase = {
  readonly objectStoreNames: { readonly contains: (name: string) => boolean };
  readonly createObjectStore: (name: string, options: unknown) => RecordingStore;
};

type RecordingTransaction = { readonly objectStore: (name: string) => RecordingStore };

type Upgrade = (db: RecordingDatabase, upgrading: RecordingTransaction) => void;

type OpenedDatabase = {
  readonly name: string;
  readonly version: number;
  readonly upgrade: Upgrade;
};

function recordingStore(layout: StoreLayout): RecordingStore {
  return {
    indexNames: { contains: (name) => Object.hasOwn(layout.indexes, name) },
    createIndex: (name, keyPath, options) => {
      layout.indexes[name] = { keyPath, options };
    },
  };
}

function layoutOf(opened: OpenedDatabase): DatabaseLayout {
  const stores: Record<string, StoreLayout> = {};
  const storeNamed = (name: string): RecordingStore => {
    const layout = stores[name];
    if (layout === undefined) throw new Error(`The upgrade reached a store it never made: ${name}`);
    return recordingStore(layout);
  };
  const db: RecordingDatabase = {
    objectStoreNames: { contains: (name) => Object.hasOwn(stores, name) },
    createObjectStore: (name, options) => {
      const layout: StoreLayout = { options, indexes: {} };
      stores[name] = layout;
      return recordingStore(layout);
    },
  };
  opened.upgrade(db, { objectStore: storeNamed });
  return { name: opened.name, version: opened.version, stores };
}

const READER_DATABASE: DatabaseLayout = {
  name: 'reader',
  version: 3,
  stores: {
    books: { options: { keyPath: 'id' }, indexes: {} },
    'page-lists': { options: { keyPath: 'id' }, indexes: {} },
    'removed-books': { options: { keyPath: 'id' }, indexes: {} },
  },
};

const RECOGNITION_DATABASE: DatabaseLayout = {
  name: 'recognition',
  version: 5,
  stores: {
    'model-consent': { options: { keyPath: 'language' }, indexes: {} },
    captures: {
      options: { keyPath: 'id' },
      indexes: {
        bookId: { keyPath: 'bookId', options: { unique: false } },
        tagIds: { keyPath: 'tagIds', options: { unique: false, multiEntry: true } },
      },
    },
    'recognizer-setup': { options: { keyPath: 'language' }, indexes: {} },
    tags: { options: { keyPath: 'id' }, indexes: {} },
  },
};

export { READER_DATABASE, RECOGNITION_DATABASE, layoutOf };
export type { DatabaseLayout, OpenedDatabase, Upgrade };
