import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ApplyRemoteCaptureResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteCaptureDeps = { readonly captures: CaptureRepository };

function applyRemoteCapture(
  deps: ApplyRemoteCaptureDeps,
  capture: Capture,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteCaptureResult> {
  return deps.captures.applyRemote({ kind: 'save-capture', capture, accepted });
}

export { applyRemoteCapture };
export type { ApplyRemoteCaptureDeps, ApplyRemoteCaptureResult };
