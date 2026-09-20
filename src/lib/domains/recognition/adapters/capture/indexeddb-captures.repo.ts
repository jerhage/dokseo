import {
  deleteByIndex,
  deleteRecord,
  listByIndex,
  listRecords,
  putRecord,
} from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import type { BookId, CaptureId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { captureFromStored, oldestFirst } from '../../domain/capture/capture';
import type { Capture, StoredCapture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import {
  CAPTURE_BOOK_INDEX,
  CAPTURE_STORE,
  recognitionDatabase,
  recordsAvailable,
} from '../recognition-database';

function unavailable(): Result<never, CaptureError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, CaptureError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function createCaptureRepository(): CaptureRepository {
  return {
    async listForBook(book: BookId): Promise<Result<readonly Capture[], CaptureError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const records = await listByIndex<StoredCapture>(
          await recognitionDatabase(),
          CAPTURE_STORE,
          CAPTURE_BOOK_INDEX,
          book,
        );
        return ok(oldestFirst(records.map(captureFromStored)));
      } catch (cause) {
        return failed(cause);
      }
    },

    async listEverything(): Promise<Result<readonly Capture[], CaptureError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const records = await listRecords<StoredCapture>(
          await recognitionDatabase(),
          CAPTURE_STORE,
        );
        return ok(oldestFirst(records.map(captureFromStored)));
      } catch (cause) {
        return failed(cause);
      }
    },

    async save(capture: Capture): Promise<Result<void, CaptureError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(await recognitionDatabase(), CAPTURE_STORE, capture);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async remove(capture: CaptureId): Promise<Result<void, CaptureError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await deleteRecord(await recognitionDatabase(), CAPTURE_STORE, capture);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async clearBook(book: BookId): Promise<Result<void, CaptureError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await deleteByIndex(await recognitionDatabase(), CAPTURE_STORE, CAPTURE_BOOK_INDEX, book);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createCaptureRepository };
