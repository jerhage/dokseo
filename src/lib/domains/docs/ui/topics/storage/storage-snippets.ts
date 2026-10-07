import type { SourceSnippet } from '../ocr/ocr-snippets';

const SCRATCH_OPEN: SourceSnippet = {
  label: 'Opening the demo database',
  file: 'src/lib/domains/docs/ui/topics/storage/scratch-database.ts',
  code: `const request = indexedDB.open(SCRATCH_DATABASE, SCRATCH_VERSION);
request.onupgradeneeded = () => {
  request.result.createObjectStore(SCRATCH_STORE, { keyPath: 'id', autoIncrement: true });
  kind = 'created';
};`,
};

const SCRATCH_WRITE: SourceSnippet = {
  label: 'Writing the demo file in a worker',
  file: 'src/lib/domains/docs/ui/topics/storage/scratch-file.worker.ts',
  code: `const root = await navigator.storage.getDirectory();
const folder = await root.getDirectoryHandle(SCRATCH_DIRECTORY, { create: true });
const handle: SyncWritableHandle = await folder.getFileHandle(SCRATCH_FILE, { create: true });

const open = handle.createSyncAccessHandle;
if (open === undefined) throw new Error('This browser has no createSyncAccessHandle()');

const access = await open.call(handle);
try {
  access.truncate(0);
  const written = access.write(new TextEncoder().encode(text), { at: 0 });
  access.flush();
  return written;
} finally {
  access.close();
}`,
};

const READER_UPGRADE: SourceSnippet = {
  label: 'The reader database upgrade',
  file: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
  code: `function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(BOOK_STORE)) {
    db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(PAGE_LIST_STORE)) {
    db.createObjectStore(PAGE_LIST_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(REMOVED_BOOK_STORE)) {
    db.createObjectStore(REMOVED_BOOK_STORE, { keyPath: 'id' });
  }
}`,
};

const WRITER_LOOP: SourceSnippet = {
  label: 'The OPFS writer worker',
  file: 'src/workers/opfs-writer.worker.ts',
  code: `async function write(request: OpfsWriteRequest): Promise<void> {
  const total = request.blob.size;
  const access = await accessFor(request);

  try {
    access.truncate(0);
    post({ kind: 'written', id: request.id, written: 0, total });

    for (const chunk of chunkRanges(total, WRITE_CHUNK_BYTES)) {
      const bytes = await request.blob.slice(chunk.from, chunk.to).arrayBuffer();
      access.write(new Uint8Array(bytes), { at: chunk.from });
      post({ kind: 'written', id: request.id, written: chunk.to, total });
    }

    access.flush();
  } finally {
    access.close();
  }
}`,
};

const STORAGE_ACCOUNT: SourceSnippet = {
  label: 'Reading the storage account',
  file: 'src/lib/domains/storage/use-cases/read-storage-account.ts',
  code: `async function readStorageAccount(deps: ReadStorageAccountDeps): Promise<ReadStorageAccountResult> {
  const { cached, files } = await deps.stores.survey();
  const parts = [
    ...(cached === null ? [CACHE_UNREADABLE] : cachedParts(cached)),
    ...(files === null ? [FILES_UNREADABLE] : storedParts(files)),
    RECORDS,
  ];

  const [space, persisted] = await Promise.all([deps.estimate(), deps.persisted()]);
  return { kind: 'success', account: accountOf(parts, space, persisted) };
}`,
};

const PERSISTENCE_REQUEST: SourceSnippet = {
  label: 'The persistence request',
  file: 'src/lib/platform/storage/persistence.ts',
  code: `async function requestPersistence(): Promise<boolean> {
  const storage = storageManager();
  if (typeof storage?.persist !== 'function') return false;
  try {
    return (await storage.persist()) === true;
  } catch {
    return false;
  }
}`,
};

const CONSENT_ASKS: SourceSnippet = {
  label: 'Agreeing to the model download',
  file: 'src/lib/domains/recognition/use-cases/model/grant-model-consent.ts',
  code: `const record = await deps.setups.read(language);
const chosen = storedChoice(language, record);

void deps.requestPersistence().catch(() => undefined);
const recorded = await deps.consent.recordGrant(language, chosen.model);
return recorded;`,
};

const KNOWN_STORED_VALUE: SourceSnippet = {
  label: 'A stored field that fails its check',
  file: 'src/lib/shared/corrupt-row.ts',
  code: `function knownStoredValue<T>(
  row: string,
  field: string,
  value: unknown,
  known: (value: unknown) => value is T,
): T {
  if (known(value)) return value;
  throw new CorruptRow(row, field, value);
}`,
};

const BOOKS_FROM_STORED: SourceSnippet = {
  label: 'Reading every book row',
  file: 'src/lib/domains/library/domain/book/stored-book.ts',
  code: `function storedBookRead(row: StoredBook): StoredBookRead {
  try {
    const book = bookFromStored(row);
    return { kind: 'readable', book };
  } catch (cause) {
    return { kind: 'unreadable', book: unreadableBook(row, cause) };
  }
}

function booksFromStored(rows: readonly StoredBook[]): StoredBooks {
  const books: Book[] = [];
  const unreadable: UnreadableBook[] = [];
  for (const row of rows) {
    const read = storedBookRead(row);
    if (read.kind === 'readable') books.push(read.book);
    else unreadable.push(read.book);
  }
  return { books, unreadable };
}`,
};

const STORAGE_SNIPPETS: readonly SourceSnippet[] = [
  SCRATCH_OPEN,
  SCRATCH_WRITE,
  READER_UPGRADE,
  WRITER_LOOP,
  STORAGE_ACCOUNT,
  PERSISTENCE_REQUEST,
  CONSENT_ASKS,
  KNOWN_STORED_VALUE,
  BOOKS_FROM_STORED,
];

export {
  BOOKS_FROM_STORED,
  CONSENT_ASKS,
  KNOWN_STORED_VALUE,
  PERSISTENCE_REQUEST,
  READER_UPGRADE,
  SCRATCH_OPEN,
  SCRATCH_WRITE,
  STORAGE_ACCOUNT,
  STORAGE_SNIPPETS,
  WRITER_LOOP,
};
