import type { TagId } from '$lib/shared/ids';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';
import { untaggedCapture } from '../../domain/tag/capture-tags';

type RemoveTagFromCaptureDeps = {
  readonly captures: CaptureRepository;
};

async function removeTagFromCapture(
  deps: RemoveTagFromCaptureDeps,
  capture: Capture,
  tag: TagId,
): Promise<Result<Capture, CaptureError>> {
  const untagged = untaggedCapture(capture, tag);
  const stored = await deps.captures.save(untagged);
  if (!stored.ok) return stored;

  return ok(untagged);
}

export { removeTagFromCapture };
export type { RemoveTagFromCaptureDeps };
