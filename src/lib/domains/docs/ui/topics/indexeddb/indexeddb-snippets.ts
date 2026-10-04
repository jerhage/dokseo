import type { SourceSnippet } from '../ocr/ocr-snippets';

const RECOGNITION_UPGRADE: SourceSnippet = {
  label: 'The upgrade of the recognition database, in recognition-database.ts',
  file: 'src/lib/domains/recognition/adapters/recognition-database.ts',
  code: `function upgrade(db: IDBDatabase): void {
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

  if (!db.objectStoreNames.contains(TAG_STORE)) {
    db.createObjectStore(TAG_STORE, { keyPath: 'id' });
  }
}`,
};

const TRANSACT: SourceSnippet = {
  label: 'Every helper runs through transact, in platform/idb/connection.ts',
  file: 'src/lib/platform/idb/connection.ts',
  code: `const transaction = live.transaction(store, mode);
const request = run(transaction.objectStore(store));
transaction.oncomplete = () => resolve(request.result);`,
};

const LIST_BY_INDEX: SourceSnippet = {
  label: 'One book’s captures, through the bookId index',
  file: 'src/lib/platform/idb/connection.ts',
  code: `function listByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey,
): Promise<T[]> {
  return transact(db, store, 'readonly', (objectStore) => objectStore.index(index).getAll(key));
}`,
};

const REWRITE_BY_INDEX: SourceSnippet = {
  label: 'rewriteByIndex, in platform/idb/connection.ts',
  file: 'src/lib/platform/idb/connection.ts',
  code: `await transact(db, store, 'readwrite', (objectStore) => {
  const matching = objectStore.index(index).getAll(key);
  matching.onsuccess = () => {
    for (const record of matching.result) objectStore.put(rewrite(record));
  };
  return matching;
});`,
};

const MOVE_BOOK: SourceSnippet = {
  label: 'The capture repository moves a book’s captures with it',
  file: 'src/lib/domains/recognition/adapters/capture/indexeddb-captures.repo.ts',
  code: `await rewriteByIndex<StoredCapture>(
  await recognitionDatabase(),
  CAPTURE_STORE,
  CAPTURE_BOOK_INDEX,
  from,
  (row) => ({ ...row, bookId: to }),
);`,
};

const VERSION_CHANGE: SourceSnippet = {
  label: 'A connection closes when another tab opens a newer version',
  file: 'src/lib/platform/idb/connection.ts',
  code: `db.onversionchange = () => {
  db.close();
  release();
};
db.onclose = release;`,
};

const BLOCKED_PATIENCE: SourceSnippet = {
  label: 'The opening side waits, but not forever',
  file: 'src/lib/platform/idb/connection.ts',
  code: `request.onblocked = () => {
  stopWaiting();
  patience = setTimeout(() => {
    abandoned = true;
    reject(heldByAnotherTab(name));
  }, BLOCKED_PATIENCE_MS);
};`,
};

const EXPORT_JOIN: SourceSnippet = {
  label: 'The export joins captures to books with a Set and a Map, in build-captures-file.ts',
  file: 'src/lib/domains/storage/use-cases/build-captures-file.ts',
  code: `const held = new Set(captures.map((capture) => capture.bookId));
const books = [...known.values()].filter((book) => held.has(book.id)).toSorted(byTitleThenId);
const keys = new Map(books.map((book, index) => [book.id, keyAt(index)]));
const entries = captures.flatMap((capture) => {
  const key = keys.get(capture.bookId);
  return key === undefined ? [] : [fileCapture(capture, key)];
});`,
};

const DELETE_TAG: SourceSnippet = {
  label: 'Deleting a tag reads every capture and filters, in delete-tag.ts',
  file: 'src/lib/domains/recognition/use-cases/tag/delete-tag.ts',
  code: `const everything = await deps.captures.listEverything();
if (everything.kind !== 'success') return everything;

const carrying = everything.captures.filter((capture) => capture.tagIds.includes(tag));

for (const capture of carrying) {
  const stored = await deps.captures.save(untaggedCapture(capture, tag));
  if (stored.kind !== 'success') return stored;
}`,
};

const INDEXEDDB_SNIPPETS: readonly SourceSnippet[] = [
  RECOGNITION_UPGRADE,
  TRANSACT,
  LIST_BY_INDEX,
  REWRITE_BY_INDEX,
  MOVE_BOOK,
  VERSION_CHANGE,
  BLOCKED_PATIENCE,
  EXPORT_JOIN,
  DELETE_TAG,
];

export {
  BLOCKED_PATIENCE,
  DELETE_TAG,
  EXPORT_JOIN,
  INDEXEDDB_SNIPPETS,
  LIST_BY_INDEX,
  MOVE_BOOK,
  RECOGNITION_UPGRADE,
  REWRITE_BY_INDEX,
  TRANSACT,
  VERSION_CHANGE,
};
