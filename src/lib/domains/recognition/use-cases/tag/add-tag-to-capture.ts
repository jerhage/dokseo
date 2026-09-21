import type { TagId } from '$lib/shared/ids';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { taggedCapture } from '../../domain/tag/capture-tags';

type AddTagToCaptureDeps = {
  readonly captures: CaptureRepository;
};

async function addTagToCapture(
  deps: AddTagToCaptureDeps,
  capture: Capture,
  tag: TagId,
): Promise<Result<Capture, CaptureError>> {
  const tagged = taggedCapture(capture, tag);
  const stored = await deps.captures.save(tagged);
  if (!stored.ok) return stored;

  return ok(tagged);
}

export { addTagToCapture };
export type { AddTagToCaptureDeps };
