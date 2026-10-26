import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ApplyRemoteTagRemovalResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteTagRemovalDeps = { readonly captures: CaptureRepository };

function applyRemoteTagRemoval(
  deps: ApplyRemoteTagRemovalDeps,
  id: TagId,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteTagRemovalResult> {
  return deps.captures.applyRemote({ kind: 'remove-tag', id, accepted });
}

export { applyRemoteTagRemoval };
export type { ApplyRemoteTagRemovalDeps, ApplyRemoteTagRemovalResult };
