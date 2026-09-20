import { ok, type Result } from '$lib/shared/result';
import { takenCapture, type Capture, type CaptureDraft } from '../domain/capture';
import type { CaptureError, CaptureRepository } from '../domain/capture-repository';

export type SaveCaptureDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

export async function saveCapture(
  deps: SaveCaptureDeps,
  draft: CaptureDraft,
): Promise<Result<Capture, CaptureError>> {
  const capture = takenCapture(draft, deps.now());
  const stored = await deps.captures.save(capture);
  if (!stored.ok) return stored;

  return ok(capture);
}
