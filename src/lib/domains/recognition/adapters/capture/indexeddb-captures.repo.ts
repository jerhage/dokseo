import {
  deleteByIndex,
  deleteRecord,
  listByIndex,
  listRecords,
  putRecord,
} from '$lib/platform/idb/connection';
import type { BookId, CaptureId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { capturesFromStored, oldestFirst } from '../../domain/capture/capture';
import type { Capture, StoredCapture } from '../../domain/capture/capture';
import type {
  CaptureListing,
  CaptureRepository,
  CaptureWrite,
} from '../../domain/capture/capture-repository';
import {
  CAPTURE_BOOK_INDEX,
  CAPTURE_STORE,
  recognitionDatabase,
  recordsAvailable,
} from '../recognition-database';

const WRITTEN: CaptureWrite = { kind: 'success' };

function listed(records: readonly StoredCapture[]): CaptureListing {
  const read = capturesFromStored(records);
  return { kind: 'success', captures: oldestFirst(read.captures), unreadable: read.unreadable };
}

function createCaptureRepository(): CaptureRepository {
  return {
    async listForBook(book: BookId): Promise<CaptureListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const records = await listByIndex<StoredCapture>(
        await recognitionDatabase(),
        CAPTURE_STORE,
        CAPTURE_BOOK_INDEX,
        book,
      );
      return listed(records);
    },

    async listEverything(): Promise<CaptureListing> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const records = await listRecords<StoredCapture>(await recognitionDatabase(), CAPTURE_STORE);
      return listed(records);
    },

    async save(capture: Capture): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await recognitionDatabase(), CAPTURE_STORE, capture);
      return WRITTEN;
    },

    async remove(capture: CaptureId): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await recognitionDatabase(), CAPTURE_STORE, capture);
      return WRITTEN;
    },

    async clearBook(book: BookId): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteByIndex(await recognitionDatabase(), CAPTURE_STORE, CAPTURE_BOOK_INDEX, book);
      return WRITTEN;
    },
  };
}

export { createCaptureRepository };
