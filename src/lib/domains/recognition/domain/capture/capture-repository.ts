import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture, UnreadableCapture } from './capture';

type CaptureListing =
  | {
      readonly kind: 'success';
      readonly captures: readonly Capture[];
      readonly unreadable: readonly UnreadableCapture[];
    }
  | StorageUnavailable;

type CaptureWrite = { readonly kind: 'success' } | StorageUnavailable;

type CaptureUntagging =
  | { readonly kind: 'success'; readonly untagged: number }
  | StorageUnavailable;

interface CaptureRepository {
  listForBook(book: BookId): Promise<CaptureListing>;
  listEverything(): Promise<CaptureListing>;
  save(capture: Capture): Promise<CaptureWrite>;
  remove(capture: CaptureId): Promise<CaptureWrite>;
  clearBook(book: BookId): Promise<CaptureWrite>;
  moveBook(from: BookId, to: BookId): Promise<CaptureWrite>;
  untagEverywhere(tag: TagId): Promise<CaptureUntagging>;
}

export type { CaptureListing, CaptureRepository, CaptureUntagging, CaptureWrite };
