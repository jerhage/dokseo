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
import { holdingLock, holdingLockIfFree } from '$lib/platform/locks/web-locks';
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

function pageListWrite(id: BookId, order: PageOrder): RecordWrite {
  if (order.kind === 'intrinsic') return { kind: 'delete', store: PAGE_LIST_STORE, key: id };
  const pageList: StoredPageList = { id, names: order.names };
  return { kind: 'put', store: PAGE_LIST_STORE, record: pageList };
}

function additionWrites(book: Book, order: PageOrder): readonly RecordWrite[] {
  return [
    pageListWrite(book.id, order),
    { kind: 'put', store: BOOK_STORE, record: book },
    { kind: 'delete', store: REMOVED_BOOK_STORE, key: book.id },
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

function stagedKeys(keys: BlobKeys): BlobKeys {
  return { source: `${keys.source}.next`, cover: `${keys.cover}.next` };
}

async function discard(keys: BlobKeys): Promise<void> {
  await blobs.remove(keys.source).catch(() => undefined);
  await blobs.remove(keys.cover).catch(() => undefined);
}

function fileLock(id: BookId): string {
  return `book-files:${id}`;
}

function fileOwner(name: string): BookId | null {
  const id = parsedBookId(name.replace(/\.(?:src|cover)$/u, ''));
  if (id === null) return null;
  const keys = blobKeys(id);
  return name === keys.source || name === keys.cover ? id : null;
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

  const writeBlobs = async (
    keys: BlobKeys,
    source: Blob,
    cover: Blob | null,
    report: SourceWriteReport,
  ): Promise<LibraryWrite> => {
    try {
      await blobs.put(keys.source, source, report);
      if (cover === null) await blobs.remove(keys.cover).catch(() => undefined);
      else await blobs.put(keys.cover, cover);
      return WRITTEN;
    } catch (cause) {
      await discard(keys);
      if (isPrivateWindowRefusal(cause)) return STORAGE_UNAVAILABLE;
      throw cause;
    }
  };

  const swapBlobs = async (
    keys: BlobKeys,
    source: Blob,
    cover: Blob | null,
    report: SourceWriteReport,
  ): Promise<LibraryWrite> => {
    const staged = stagedKeys(keys);
    try {
      await blobs.put(staged.source, source, report);
      if (cover !== null) await blobs.put(staged.cover, cover);
      await blobs.replace(staged.source, keys.source);
      if (cover === null) await blobs.remove(keys.cover);
      else await blobs.replace(staged.cover, keys.cover);
      return WRITTEN;
    } catch (cause) {
      await discard(staged);
      if (isPrivateWindowRefusal(cause)) return STORAGE_UNAVAILABLE;
      throw cause;
    }
  };

  const writeBook = async (
    book: Book,
    source: Blob,
    cover: Blob | null,
    order: PageOrder,
    report: SourceWriteReport,
  ): Promise<LibraryWrite> => {
    const keys = blobKeys(book.id);
    const written = await writeBlobs(keys, source, cover, report);
    if (written.kind !== 'success') return written;
    try {
      await writeRecords(await database(), additionWrites(book, order));
    } catch (cause) {
      await discard(keys);
      throw cause;
    }
    return WRITTEN;
  };

  const reclaimStrayFiles = async (): Promise<void> => {
    const db = await database();
    const rows = await listRecords<StoredBook>(db, BOOK_STORE);
    const shelved = new Set<unknown>(rows.map((row) => row.id));
    const strays = new Set(
      (await blobs.keys()).flatMap((name) => {
        const owner = fileOwner(name);
        return owner === null || shelved.has(owner) ? [] : [owner];
      }),
    );
    for (const id of strays) {
      await holdingLockIfFree(fileLock(id), async () => {
        if ((await getRecord<StoredBook>(db, BOOK_STORE, id)) === undefined) {
          await discard(blobKeys(id));
        }
      });
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
      const added = await holdingLock(fileLock(book.id), () =>
        writeBook(book, source, cover, order, report),
      );
      if (added.kind === 'success') await reclaimStrayFiles().catch(() => undefined);
      return added;
    },

    async replaceFile(
      book: Book,
      source: Blob,
      cover: Blob | null,
      order: PageOrder,
      report: SourceWriteReport = () => undefined,
    ): Promise<LibraryWrite> {
      if (!recordsAvailable() || !blobs.isAvailable()) return STORAGE_UNAVAILABLE;
      return holdingLock(fileLock(book.id), async () => {
        const swapped = await swapBlobs(blobKeys(book.id), source, cover, report);
        if (swapped.kind !== 'success') return swapped;
        await writeRecords(await database(), additionWrites(book, order));
        return WRITTEN;
      });
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
