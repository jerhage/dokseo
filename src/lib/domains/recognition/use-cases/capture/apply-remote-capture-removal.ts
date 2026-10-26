import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { CaptureId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ApplyRemoteCaptureRemovalResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteCaptureRemovalDeps = { readonly captures: CaptureRepository };

function applyRemoteCaptureRemoval(
  deps: ApplyRemoteCaptureRemovalDeps,
  id: CaptureId,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteCaptureRemovalResult> {
  return deps.captures.applyRemote({ kind: 'remove-capture', id, accepted });
}

export { applyRemoteCaptureRemoval };
export type { ApplyRemoteCaptureRemovalDeps, ApplyRemoteCaptureRemovalResult };
