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
import { bookFromStored } from '../domain/book/stored-book';
import type { StoredBook } from '../domain/book/stored-book';
import type { SourceWriteReport } from '../domain/ingest/upload-progress';

const DATABASE_NAME = 'reader';

const DATABASE_VERSION = 1;

const BOOK_STORE = 'books';

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
}

async function discard(keys: BlobKeys): Promise<void> {
  await blobs.remove(keys.source).catch(() => undefined);
  await blobs.remove(keys.cover).catch(() => undefined);
}

export function createLibraryRepository(): LibraryRepository {
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
  ): Promise<Result<Blob, LibraryError>> => {
    if (!blobs.isAvailable()) return unavailable();
    const keys = blobKeys(id);
    if (keys === null) return notFlat(id);
    try {
      const blob = await blobs.get(pick(keys));
      if (blob === null) return missing(id);
      return ok(blob);
    } catch (cause) {
      return failed(cause);
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
      cover: Blob,
      report: SourceWriteReport = () => undefined,
    ): Promise<Result<void, LibraryError>> {
      if (!recordsAvailable() || !blobs.isAvailable()) return unavailable();
      const keys = blobKeys(book.id);
      if (keys === null) return notFlat(book.id);
      try {
        await blobs.put(keys.source, source, report);
        await blobs.put(keys.cover, cover);
      } catch (cause) {
        await discard(keys);
        return failed(cause);
      }
      try {
        await putRecord(await database(), BOOK_STORE, book);
        return ok(undefined);
      } catch (cause) {
        await discard(keys);
        return failed(cause);
      }
    },

    async remove(id: BookId): Promise<Result<void, LibraryError>> {
      if (!recordsAvailable() || !blobs.isAvailable()) return unavailable();
      const keys = blobKeys(id);
      if (keys === null) return notFlat(id);
      try {
        await deleteRecord(await database(), BOOK_STORE, id);
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

    readSource(id: BookId): Promise<Result<Blob, LibraryError>> {
      return readBlob(id, (keys) => keys.source);
    },

    readCover(id: BookId): Promise<Result<Blob, LibraryError>> {
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
