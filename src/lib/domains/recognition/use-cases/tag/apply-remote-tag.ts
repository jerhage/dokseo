import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import type { Tag } from '../../domain/tag/tag';

type ApplyRemoteTagResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteTagDeps = { readonly captures: CaptureRepository };

function applyRemoteTag(
  deps: ApplyRemoteTagDeps,
  tag: Tag,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteTagResult> {
  return deps.captures.applyRemote({ kind: 'save-tag', tag, accepted });
}

export { applyRemoteTag };
export type { ApplyRemoteTagDeps, ApplyRemoteTagResult };
