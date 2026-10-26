import type {
  AcceptedVersion,
  PendingMarkers,
  RecordVersions,
  SettledMarker,
} from '$lib/shared/change-marker';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Tag } from '../tag/tag';
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

type RemoteRecognitionWrite =
  | { readonly kind: 'save-capture'; readonly capture: Capture; readonly accepted: AcceptedVersion }
  | { readonly kind: 'remove-capture'; readonly id: CaptureId; readonly accepted: AcceptedVersion }
  | { readonly kind: 'save-tag'; readonly tag: Tag; readonly accepted: AcceptedVersion }
  | { readonly kind: 'remove-tag'; readonly id: TagId; readonly accepted: AcceptedVersion };

interface CaptureRepository {
  listForBook(book: BookId): Promise<CaptureListing>;
  listEverything(): Promise<CaptureListing>;
  save(capture: Capture): Promise<CaptureWrite>;
  remove(capture: CaptureId): Promise<CaptureWrite>;
  clearBook(book: BookId): Promise<CaptureWrite>;
  moveBook(from: BookId, to: BookId): Promise<CaptureWrite>;
  untagEverywhere(tag: TagId): Promise<CaptureUntagging>;
  pendingChanges(): Promise<PendingMarkers>;
  settleChanges(settled: readonly SettledMarker[]): Promise<CaptureWrite>;
  recordVersions(): Promise<RecordVersions>;
  applyRemote(write: RemoteRecognitionWrite): Promise<CaptureWrite>;
}

export type {
  CaptureListing,
  CaptureRepository,
  CaptureUntagging,
  CaptureWrite,
  RemoteRecognitionWrite,
};
