import { match } from 'ts-pattern';
import { captureFromStored } from '$lib/domains/recognition/domain/capture/capture';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Anchor } from '$lib/shared/anchor';
import { storedContentHash } from '$lib/domains/library/domain/book/stored-book';
import { CorruptRow, isStoredFields } from '$lib/shared/corrupt-row';
import { bookId } from '$lib/shared/ids';
import type { BookId, CaptureId, ContentHash, TagId } from '$lib/shared/ids';
import { unreadableData } from './unreadable-data';
import type { UnreadableData } from './unreadable-data';

type CaptureHistoryData = {
  readonly createdAt: number;
  readonly editedAt: number | null;
  readonly tagIds: readonly TagId[];
};

type CaptureBase = {
  readonly bookKey: ContentHash;
  readonly anchor: Anchor;
  readonly text: string;
} & CaptureHistoryData;

type CaptureData =
  | (CaptureBase & {
      readonly origin: 'recognized';
      readonly note: string | null;
      readonly confidence: number | null;
    })
  | (CaptureBase & { readonly origin: 'written' })
  | (CaptureBase & { readonly origin: 'lifted'; readonly note: string | null });

type WithoutBook<C> = C extends unknown ? Omit<C, 'bookId'> : never;

type SyncedCapture = WithoutBook<Capture>;

type CaptureFromSyncData =
  | {
      readonly kind: 'success';
      readonly capture: SyncedCapture;
      readonly bookKey: ContentHash;
    }
  | UnreadableData;

const UNPLACED_BOOK = bookId('unplaced');

function toSyncCaptureData(capture: Capture, bookKey: ContentHash): CaptureData {
  const base: CaptureBase = {
    bookKey,
    anchor: capture.anchor,
    text: capture.text,
    createdAt: capture.createdAt,
    editedAt: capture.editedAt,
    tagIds: capture.tagIds,
  };
  return match(capture)
    .returnType<CaptureData>()
    .with({ origin: 'recognized' }, (read) => ({
      ...base,
      origin: 'recognized',
      note: read.note,
      confidence: read.confidence,
    }))
    .with({ origin: 'written' }, () => ({ ...base, origin: 'written' }))
    .with({ origin: 'lifted' }, (lifted) => ({ ...base, origin: 'lifted', note: lifted.note }))
    .exhaustive();
}

function syncedCaptureOf(capture: Capture): SyncedCapture {
  const { bookId: _unplaced, ...synced } = capture;
  return synced;
}

function fromSyncCaptureData(data: unknown, recordId: CaptureId): CaptureFromSyncData {
  try {
    if (!isStoredFields(data)) throw new CorruptRow('capture', 'data', data);
    const bookKey = storedContentHash(data['bookKey']);
    const capture = captureFromStored({ ...data, id: recordId, bookId: UNPLACED_BOOK });
    return { kind: 'success', capture: syncedCaptureOf(capture), bookKey };
  } catch (cause) {
    return unreadableData(cause);
  }
}

function placedCapture(synced: SyncedCapture, book: BookId): Capture {
  return { ...synced, bookId: book };
}

export { fromSyncCaptureData, placedCapture, toSyncCaptureData };
export type { CaptureData, CaptureFromSyncData, SyncedCapture };
