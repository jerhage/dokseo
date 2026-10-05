import {
  deleteRecord,
  getRecord,
  listRecords,
  openDatabase,
  putRecord,
  writeAfterRead,
  writeRecords,
} from '$lib/platform/idb/connection';
import type { RecordWrite } from '$lib/platform/idb/connection';
import * as blobs from '$lib/platform/opfs/blob-store';
import { isPrivateWindowRefusal } from '$lib/platform/opfs/directory';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { applyEdit } from '../domain/book/book';
import type { Book, BookEdit } from '../domain/book/book';
import type {
  BookListing,
  BookLookup,
  ByteCount,
  FileLookup,
  HeldBookLookup,
  LibraryRepository,
  LibraryWrite,
  PageListLookup,
  RemovedListing,
  RestorableListing,
} from '../domain/book/library-repository';
import { pageListFromStored } from '../domain/book/page-list';
import type { PageOrder, StoredPageList } from '../domain/book/page-list';
import {
  removedBooksFromStored,
  removedRecord,
  restoreCandidatesFrom,
  unreadableRemovedBooksFrom,
} from '../domain/book/removed-book';
import type { RemovedBook, StoredRemovedBook } from '../domain/book/removed-book';
import { bookFromStored, booksFromStored, storedBookRead } from '../domain/book/stored-book';
import type { StoredBook } from '../domain/book/stored-book';
import type { SourceWriteReport } from '../domain/ingest/upload-progress';

const DATABASE_NAME = 'reader';

const DATABASE_VERSION = 3;

const BOOK_STORE = 'books';

const PAGE_LIST_STORE = 'page-lists';

const REMOVED_BOOK_STORE = 'removed-books';

const BOOK_RECORD_STORES = [BOOK_STORE, PAGE_LIST_STORE, REMOVED_BOOK_STORE];

const WRITTEN: LibraryWrite = { kind: 'success' };

type BlobKeys = { readonly source: string; readonly cover: string };

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function blobKeys(id: BookId): BlobKeys {
  if (parsedBookId(id) === null) throw new Error(`Book id "${id}" is not a flat storage key`);
  return { source: `${id}.src`, cover: `${id}.cover` };
}

async function unlessRefused<T>(work: () => Promise<T>): Promise<T | StorageUnavailable> {
  try {
    const done = await work();
    return done;
  } catch (cause) {
    if (isPrivateWindowRefusal(cause)) return STORAGE_UNAVAILABLE;
    throw cause;
  }
}

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(BOOK_STORE)) {
    db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(PAGE_LIST_STORE)) {
    db.createObjectStore(PAGE_LIST_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(REMOVED_BOOK_STORE)) {
    db.createObjectStore(REMOVED_BOOK_STORE, { keyPath: 'id' });
  }
}

function retired(row: StoredBook, removedAt: number): StoredRemovedBook {
  const [book] = booksFromStored([row]).books;
  return book === undefined ? { ...row, removedAt } : removedRecord(book, removedAt);
}

function shelfDeletes(id: BookId): readonly RecordWrite[] {
  return [
    { kind: 'delete', store: BOOK_STORE, key: id },
    { kind: 'delete', store: PAGE_LIST_STORE, key: id },
  ];
}

function removalWrites(
  id: BookId,
  row: StoredBook | undefined,
  removedAt: number,
): readonly RecordWrite[] {
  if (row === undefined) return shelfDeletes(id);
  return [
    { kind: 'put', store: REMOVED_BOOK_STORE, record: retired(row, removedAt) },
    ...shelfDeletes(id),
  ];
}

function erasureWrites(id: BookId): readonly RecordWrite[] {
  return [...shelfDeletes(id), { kind: 'delete', store: REMOVED_BOOK_STORE, key: id }];
}

function removeFiles(keys: BlobKeys): Promise<LibraryWrite> {
  return unlessRefused<LibraryWrite>(async () => {
    await blobs.remove(keys.source);
    await blobs.remove(keys.cover);
    return WRITTEN;
  });
}

async function discard(keys: BlobKeys): Promise<void> {
  await blobs.remove(keys.source).catch(() => undefined);
  await blobs.remove(keys.cover).catch(() => undefined);
}

function createLibraryRepository(): LibraryRepository {
  let connection: Promise<IDBDatabase> | null = null;

  const database = (): Promise<IDBDatabase> => {
    if (connection === null) {
      const opening = openDatabase(DATABASE_NAME, DATABASE_VERSION, upgrade);
      opening.catch(() => {
        connection = null;
      });
      connection = opening;
    }
    return connection;
  };

  const readBlob = async (id: BookId, pick: (keys: BlobKeys) => string): Promise<FileLookup> => {
    if (!blobs.isAvailable()) return STORAGE_UNAVAILABLE;
    const key = pick(blobKeys(id));
    return unlessRefused<FileLookup>(async () => {
      const file = await blobs.get(key);
      return { kind: 'success', file };
    });
  };

  const forgetPageList = async (id: BookId): Promise<void> => {
    try {
      await deleteRecord(await database(), PAGE_LIST_STORE, id);
    } catch {
      return;
    }
  };

  const writeBlobs = async (
    keys: BlobKeys,
    source: Blob,
    cover: Blob | null,
    report: SourceWriteReport,
  ): Promise<LibraryWrite> => {
    try {
      await blobs.put(keys.source, source, report);
      if (cover !== null) await blobs.put(keys.cover, cover);
      return WRITTEN;
    } catch (cause) {
      await discard(keys);
      if (isPrivateWindowRefusal(cause)) return STORAGE_UNAVAILABLE;
      throw cause;
    }
  };

  return {
    async list(): Promise<BookListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const records = await listRecords<StoredBook>(await database(), BOOK_STORE);
      return { kind: 'success', ...booksFromStored(records) };
    },

    async get(id: BookId): Promise<HeldBookLookup> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const record = await getRecord<StoredBook>(await database(), BOOK_STORE, id);
      if (record === undefined) return { kind: 'success', book: null };
      const read = storedBookRead(record);
      if (read.kind === 'unreadable') return { kind: 'unreadable-book', book: read.book };
      return { kind: 'success', book: read.book };
    },

    async add(
      book: Book,
      source: Blob,
      cover: Blob | null,
      order: PageOrder,
      report: SourceWriteReport = () => undefined,
    ): Promise<LibraryWrite> {
      if (!recordsAvailable() || !blobs.isAvailable()) return STORAGE_UNAVAILABLE;
      const keys = blobKeys(book.id);
      const written = await writeBlobs(keys, source, cover, report);
      if (written.kind !== 'success') return written;
      try {
        const db = await database();
        if (order.kind === 'listed') {
          const pageList: StoredPageList = { id: book.id, names: order.names };
          await putRecord(db, PAGE_LIST_STORE, pageList);
        } else {
          await deleteRecord(db, PAGE_LIST_STORE, book.id);
        }
        await putRecord(db, BOOK_STORE, book);
      } catch (cause) {
        await discard(keys);
        await forgetPageList(book.id);
        throw cause;
      }
      if (cover === null) await blobs.remove(keys.cover).catch(() => undefined);
      await deleteRecord(await database(), REMOVED_BOOK_STORE, book.id);
      return WRITTEN;
    },

    async remove(id: BookId, removedAt: number): Promise<LibraryWrite> {
      if (!recordsAvailable() || !blobs.isAvailable()) return STORAGE_UNAVAILABLE;
      const filesRemoved = await removeFiles(blobKeys(id));
      if (filesRemoved.kind !== 'success') return filesRemoved;
      await writeAfterRead<StoredBook>(
        await database(),
        BOOK_RECORD_STORES,
        { store: BOOK_STORE, key: id },
        (row) => removalWrites(id, row, removedAt),
      );
      return WRITTEN;
    },

    async erase(id: BookId): Promise<LibraryWrite> {
      if (!recordsAvailable() || !blobs.isAvailable()) return STORAGE_UNAVAILABLE;
      const filesRemoved = await removeFiles(blobKeys(id));
      if (filesRemoved.kind !== 'success') return filesRemoved;
      await writeRecords(await database(), erasureWrites(id));
      return WRITTEN;
    },

    async listRemoved(): Promise<RemovedListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const rows = await listRecords<StoredRemovedBook>(await database(), REMOVED_BOOK_STORE);
      const records = removedBooksFromStored(rows);
      return {
        kind: 'success',
        removed: records.removed,
        unreadable: unreadableRemovedBooksFrom(records.unreadable),
      };
    },

    async listRestorable(): Promise<RestorableListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const db = await database();
      const records = removedBooksFromStored(
        await listRecords<StoredRemovedBook>(db, REMOVED_BOOK_STORE),
      );
      const rows = await listRecords<StoredBook>(db, BOOK_STORE);
      const unreadable = new Set<unknown>(booksFromStored(rows).unreadable.map((book) => book.id));
      const broken = rows.filter((row) => unreadable.has(row.id));
      return {
        kind: 'success',
        removed: records.removed,
        unreadable: restoreCandidatesFrom([...broken, ...records.unreadable]),
      };
    },

    async addRemoved(book: RemovedBook): Promise<LibraryWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await database(), REMOVED_BOOK_STORE, book);
      return WRITTEN;
    },

    async forgetRemoved(id: BookId): Promise<LibraryWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await database(), REMOVED_BOOK_STORE, id);
      return WRITTEN;
    },

    async update(id: BookId, edit: BookEdit): Promise<BookLookup> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const db = await database();
      const record = await getRecord<StoredBook>(db, BOOK_STORE, id);
      if (record === undefined) return { kind: 'success', book: null };
      const updated = applyEdit(bookFromStored(record), edit);
      await putRecord(db, BOOK_STORE, updated);
      return { kind: 'success', book: updated };
    },

    async readPageList(id: BookId): Promise<PageListLookup> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const record = await getRecord<unknown>(await database(), PAGE_LIST_STORE, id);
      return { kind: 'success', pageList: pageListFromStored(record) };
    },

    async savePageList(id: BookId, names: readonly string[]): Promise<LibraryWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const pageList: StoredPageList = { id, names };
      await putRecord(await database(), PAGE_LIST_STORE, pageList);
      return WRITTEN;
    },

    readSource(id: BookId): Promise<FileLookup> {
      return readBlob(id, (keys) => keys.source);
    },

    readCover(id: BookId): Promise<FileLookup> {
      return readBlob(id, (keys) => keys.cover);
    },

    async storedBytes(): Promise<ByteCount> {
      if (!blobs.isAvailable()) return STORAGE_UNAVAILABLE;
      return unlessRefused<ByteCount>(async () => {
        const bytes = await blobs.totalBytes();
        return { kind: 'success', bytes };
      });
    },
  };
}

export { createLibraryRepository };
