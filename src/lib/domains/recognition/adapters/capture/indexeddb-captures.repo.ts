import {
  deleteByIndex,
  deleteRecord,
  listByIndex,
  listRecords,
  putRecord,
  rewriteByIndex,
} from '$lib/platform/idb/connection';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { capturesFromStored, movedCapture, oldestFirst } from '../../domain/capture/capture';
import type { Capture, StoredCapture } from '../../domain/capture/capture';
import type {
  CaptureListing,
  CaptureRepository,
  CaptureUntagging,
  CaptureWrite,
} from '../../domain/capture/capture-repository';
import { untaggedRow } from '../../domain/tag/capture-tags';
import {
  CAPTURE_BOOK_INDEX,
  CAPTURE_STORE,
  CAPTURE_TAG_INDEX,
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

    async moveBook(from: BookId, to: BookId): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await rewriteByIndex<StoredCapture>(
        await recognitionDatabase(),
        CAPTURE_STORE,
        CAPTURE_BOOK_INDEX,
        from,
        (row) => movedCapture(row, to),
      );
      return WRITTEN;
    },

    async untagEverywhere(tag: TagId): Promise<CaptureUntagging> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      let untagged = 0;
      await rewriteByIndex<StoredCapture>(
        await recognitionDatabase(),
        CAPTURE_STORE,
        CAPTURE_TAG_INDEX,
        tag,
        (row) => {
          const rewritten = untaggedRow(row, tag);
          if (rewritten === null) return row;
          untagged += 1;
          return rewritten;
        },
      );
      return { kind: 'success', untagged };
    },
  };
}

export { createCaptureRepository };
