import {
  deleteByIndex,
  listByIndex,
  listRecords,
  rewriteByIndex,
  writeRecords,
} from '$lib/platform/idb/connection';
import { markingWrites } from '$lib/platform/idb/marking-writes';
import type { ChangeMarker, ChangeTracking } from '$lib/shared/change-marker';
import { isText } from '$lib/shared/corrupt-row';
import { captureId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { capturesFromStored, movedCapture, oldestFirst } from '../../domain/capture/capture';
import type { Capture, StoredCapture } from '../../domain/capture/capture';
import { captureMarker } from '../../domain/capture/capture-marker';
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

function rowMarker(row: StoredCapture): ChangeMarker | null {
  return isText(row.id) ? captureMarker(captureId(row.id), false, Date.now()) : null;
}

function createCaptureRepository(tracking: ChangeTracking = 'marked'): CaptureRepository {
  const rewriteMarker =
    tracking === 'marked'
      ? (_before: StoredCapture, after: StoredCapture) => rowMarker(after)
      : undefined;

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
      await writeRecords(await recognitionDatabase(), [
        { kind: 'put', store: CAPTURE_STORE, record: capture },
        ...markingWrites(tracking, [captureMarker(capture.id, false, Date.now())]),
      ]);
      return WRITTEN;
    },

    async remove(capture: CaptureId): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await writeRecords(await recognitionDatabase(), [
        { kind: 'delete', store: CAPTURE_STORE, key: capture },
        ...markingWrites(tracking, [captureMarker(capture, true, Date.now())]),
      ]);
      return WRITTEN;
    },

    async clearBook(book: BookId): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteByIndex(
        await recognitionDatabase(),
        CAPTURE_STORE,
        CAPTURE_BOOK_INDEX,
        book,
        tracking === 'marked'
          ? (primary) =>
              typeof primary === 'string'
                ? captureMarker(captureId(primary), true, Date.now())
                : null
          : undefined,
      );
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
        rewriteMarker,
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
        tracking === 'marked'
          ? (before, after) => (before === after ? null : rowMarker(after))
          : undefined,
      );
      return { kind: 'success', untagged };
    },
  };
}

export { createCaptureRepository };
