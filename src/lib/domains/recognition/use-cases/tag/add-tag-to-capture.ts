import type { TagId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';
import { taggedCapture } from '../../domain/tag/capture-tags';

type AddTagToCaptureResult =
  | { readonly kind: 'success'; readonly capture: Capture }
  | StorageUnavailable;

type AddTagToCaptureDeps = {
  readonly captures: CaptureRepository;
};

async function addTagToCapture(
  deps: AddTagToCaptureDeps,
  capture: Capture,
  tag: TagId,
): Promise<AddTagToCaptureResult> {
  const tagged = taggedCapture(capture, tag);
  const stored = await deps.captures.save(tagged);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture: tagged };
}

export { addTagToCapture };
export type { AddTagToCaptureDeps, AddTagToCaptureResult };
