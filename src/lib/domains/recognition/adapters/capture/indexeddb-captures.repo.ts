import { match } from 'ts-pattern';
import {
  deleteByIndex,
  listByIndex,
  listRecords,
  rewriteByIndex,
  rewriteByIndexAndWrite,
  settleMarkers,
  writeRecords,
} from '$lib/platform/idb/connection';
import { acceptedWrites, markingWrites } from '$lib/platform/idb/marking-writes';
import { OUTBOX_STORE, RECORD_VERSION_STORE } from '$lib/shared/change-marker';
import type {
  ChangeMarker,
  ChangeTracking,
  PendingMarkers,
  RecordVersion,
  RecordVersions,
  SettledMarker,
} from '$lib/shared/change-marker';
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
  RemoteRecognitionWrite,
} from '../../domain/capture/capture-repository';
import { untaggedRow } from '../../domain/tag/capture-tags';
import {
  CAPTURE_BOOK_INDEX,
  CAPTURE_STORE,
  CAPTURE_TAG_INDEX,
  TAG_STORE,
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

    async pendingChanges(): Promise<PendingMarkers> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const markers = await listRecords<ChangeMarker>(await recognitionDatabase(), OUTBOX_STORE);
      return { kind: 'success', markers };
    },

    async settleChanges(settled: readonly SettledMarker[]): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await settleMarkers(await recognitionDatabase(), settled);
      return WRITTEN;
    },

    async recordVersions(): Promise<RecordVersions> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const versions = await listRecords<RecordVersion>(
        await recognitionDatabase(),
        RECORD_VERSION_STORE,
      );
      return { kind: 'success', versions };
    },

    async applyRemote(write: RemoteRecognitionWrite): Promise<CaptureWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const db = await recognitionDatabase();
      await match(write)
        .returnType<Promise<void>>()
        .with({ kind: 'save-capture' }, ({ capture, accepted }) =>
          writeRecords(db, [
            { kind: 'put', store: CAPTURE_STORE, record: capture },
            ...acceptedWrites(accepted),
          ]),
        )
        .with({ kind: 'remove-capture' }, ({ id, accepted }) =>
          writeRecords(db, [
            { kind: 'delete', store: CAPTURE_STORE, key: id },
            ...acceptedWrites(accepted),
          ]),
        )
        .with({ kind: 'save-tag' }, ({ tag, accepted }) =>
          writeRecords(db, [
            { kind: 'put', store: TAG_STORE, record: tag },
            ...acceptedWrites(accepted),
          ]),
        )
        .with({ kind: 'remove-tag' }, ({ id, accepted }) =>
          rewriteByIndexAndWrite<StoredCapture>(
            db,
            CAPTURE_STORE,
            CAPTURE_TAG_INDEX,
            id,
            (row) => untaggedRow(row, id),
            [{ kind: 'delete', store: TAG_STORE, key: id }, ...acceptedWrites(accepted)],
          ),
        )
        .exhaustive();
      return WRITTEN;
    },
  };
}

export { createCaptureRepository };
