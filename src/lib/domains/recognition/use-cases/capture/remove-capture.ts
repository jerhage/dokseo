import type { CaptureId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type RemoveCaptureResult = { readonly kind: 'success' } | StorageUnavailable;

type RemoveCaptureDeps = {
  readonly captures: CaptureRepository;
};

function removeCapture(deps: RemoveCaptureDeps, capture: CaptureId): Promise<RemoveCaptureResult> {
  return deps.captures.remove(capture);
}

export { removeCapture };
export type { RemoveCaptureDeps, RemoveCaptureResult };
