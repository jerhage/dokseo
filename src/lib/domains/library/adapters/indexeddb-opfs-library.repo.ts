import {
  deleteRecord,
  getRecord,
  listRecords,
  openDatabase,
  putRecord,
} from '$lib/platform/idb/connection';
import * as blobs from '$lib/platform/opfs/blob-store';
import { describeCause } from '$lib/shared/cause';
import type { BookId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { applyEdit } from '../domain/book/book';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { pageListFromStored } from '../domain/book/page-list';
import type { PageList, PageOrder, StoredPageList } from '../domain/book/page-list';
import { bookFromStored } from '../domain/book/stored-book';
import type { StoredBook } from '../domain/book/stored-book';
import type { SourceWriteReport } from '../domain/ingest/upload-progress';

const DATABASE_NAME = 'reader';

const DATABASE_VERSION = 2;

const BOOK_STORE = 'books';

const PAGE_LIST_STORE = 'page-lists';

type BlobKeys = { readonly source: string; readonly cover: string };

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function unavailable(): Result<never, LibraryError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, LibraryError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function missing(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

function blobKeys(id: BookId): BlobKeys | null {
  const rejected = id.length === 0 || id.includes('/') || id.includes('\\') || id.includes('..');
  if (rejected) return null;
  return { source: `${id}.src`, cover: `${id}.cover` };
}

function notFlat(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'storage-failed', cause: `Book id "${id}" is not a flat storage key` });
}

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(BOOK_STORE)) {
    db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(PAGE_LIST_STORE)) {
    db.createObjectStore(PAGE_LIST_STORE, { keyPath: 'id' });
  }
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

  const readBlob = async (
    id: BookId,
    pick: (keys: BlobKeys) => string,
  ): Promise<Result<Blob | null, LibraryError>> => {
    if (!blobs.isAvailable()) return unavailable();
    const keys = blobKeys(id);
    if (keys === null) return notFlat(id);
    try {
      const blob = await blobs.get(pick(keys));
      return ok(blob);
    } catch (cause) {
      return failed(cause);
    }
  };

  const forgetPageList = async (id: BookId): Promise<void> => {
    try {
      await deleteRecord(await database(), PAGE_LIST_STORE, id);
    } catch {
      return;
    }
  };

  return {
    async list(): Promise<Result<readonly Book[], LibraryError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const records = await listRecords<StoredBook>(await database(), BOOK_STORE);
        return ok(records.map(bookFromStored));
      } catch (cause) {
        return failed(cause);
      }
    },

    async get(id: BookId): Promise<Result<Book, LibraryError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredBook>(await database(), BOOK_STORE, id);
        if (record === undefined) return missing(id);
        return ok(bookFromStored(record));
      } catch (cause) {
        return failed(cause);
      }
    },

    async add(
      book: Book,
      source: Blob,
      cover: Blob | null,
      order: PageOrder,
      report: SourceWriteReport = () => undefined,
    ): Promise<Result<void, LibraryError>> {
      if (!recordsAvailable() || !blobs.isAvailable()) return unavailable();
      const keys = blobKeys(book.id);
      if (keys === null) return notFlat(book.id);
      try {
        await blobs.put(keys.source, source, report);
        if (cover !== null) await blobs.put(keys.cover, cover);
      } catch (cause) {
        await discard(keys);
        return failed(cause);
      }
      try {
        const db = await database();
        if (order.kind === 'listed') {
          const pageList: StoredPageList = { id: book.id, names: order.names };
          await putRecord(db, PAGE_LIST_STORE, pageList);
        }
        await putRecord(db, BOOK_STORE, book);
        return ok(undefined);
      } catch (cause) {
        await discard(keys);
        await forgetPageList(book.id);
        return failed(cause);
      }
    },

    async remove(id: BookId): Promise<Result<void, LibraryError>> {
      if (!recordsAvailable() || !blobs.isAvailable()) return unavailable();
      const keys = blobKeys(id);
      if (keys === null) return notFlat(id);
      try {
        const db = await database();
        await deleteRecord(db, BOOK_STORE, id);
        await deleteRecord(db, PAGE_LIST_STORE, id);
        await blobs.remove(keys.source);
        await blobs.remove(keys.cover);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async update(id: BookId, edit: BookEdit): Promise<Result<Book, LibraryError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const db = await database();
        const record = await getRecord<StoredBook>(db, BOOK_STORE, id);
        if (record === undefined) return missing(id);
        const updated = applyEdit(bookFromStored(record), edit);
        await putRecord(db, BOOK_STORE, updated);
        return ok(updated);
      } catch (cause) {
        return failed(cause);
      }
    },

    async readPageList(id: BookId): Promise<Result<PageList, LibraryError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredPageList>(await database(), PAGE_LIST_STORE, id);
        return ok(pageListFromStored(record));
      } catch (cause) {
        return failed(cause);
      }
    },

    async savePageList(id: BookId, names: readonly string[]): Promise<Result<void, LibraryError>> {
      if (!recordsAvailable()) return unavailable();
      const pageList: StoredPageList = { id, names };
      try {
        await putRecord(await database(), PAGE_LIST_STORE, pageList);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async readSource(id: BookId): Promise<Result<Blob, LibraryError>> {
      const source = await readBlob(id, (keys) => keys.source);
      if (!source.ok) return source;
      if (source.value === null) return missing(id);
      return ok(source.value);
    },

    readCover(id: BookId): Promise<Result<Blob | null, LibraryError>> {
      return readBlob(id, (keys) => keys.cover);
    },

    async storedBytes(): Promise<Result<number, LibraryError>> {
      if (!blobs.isAvailable()) return unavailable();
      try {
        const bytes = await blobs.totalBytes();
        return ok(bytes);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createLibraryRepository };
