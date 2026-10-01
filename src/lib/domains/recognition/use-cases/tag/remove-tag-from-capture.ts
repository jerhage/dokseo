import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { untaggedCapture } from '../../domain/tag/capture-tags';

type RemoveTagFromCaptureResult =
  | { readonly kind: 'success'; readonly capture: Capture }
  | StorageUnavailable;

type RemoveTagFromCaptureDeps = {
  readonly captures: CaptureRepository;
};

async function removeTagFromCapture(
  deps: RemoveTagFromCaptureDeps,
  capture: Capture,
  tag: TagId,
): Promise<RemoveTagFromCaptureResult> {
  const untagged = untaggedCapture(capture, tag);
  const stored = await deps.captures.save(untagged);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture: untagged };
}

export { removeTagFromCapture };
export type { RemoveTagFromCaptureDeps, RemoveTagFromCaptureResult };
