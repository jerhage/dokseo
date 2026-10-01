import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type RestoreCaptureResult = { readonly kind: 'success' } | StorageUnavailable;

type RestoreCaptureDeps = {
  readonly captures: CaptureRepository;
};

function restoreCapture(deps: RestoreCaptureDeps, capture: Capture): Promise<RestoreCaptureResult> {
  return deps.captures.save(capture);
}

export { restoreCapture };
export type { RestoreCaptureDeps, RestoreCaptureResult };
