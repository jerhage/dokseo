import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type SaveCaptureDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

async function saveCapture(
  deps: SaveCaptureDeps,
  draft: CaptureDraft,
): Promise<Result<Capture, CaptureError>> {
  const capture = takenCapture(draft, deps.now());
  const stored = await deps.captures.save(capture);
  if (!stored.ok) return stored;

  return ok(capture);
}

export { saveCapture };
export type { SaveCaptureDeps };
