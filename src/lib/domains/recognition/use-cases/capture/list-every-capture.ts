import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture, UnreadableCapture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ListEveryCaptureResult =
  | {
      readonly kind: 'success';
      readonly captures: readonly Capture[];
      readonly unreadable: readonly UnreadableCapture[];
    }
  | StorageUnavailable;

type ListEveryCaptureDeps = {
  readonly captures: CaptureRepository;
};

function listEveryCapture(deps: ListEveryCaptureDeps): Promise<ListEveryCaptureResult> {
  return deps.captures.listEverything();
}

export { listEveryCapture };
export type { ListEveryCaptureDeps, ListEveryCaptureResult };
