import type { Result } from '$lib/shared/result';
import { takenCapture, type CaptureDraft } from '../domain/capture';
import type { CaptureError, CaptureRepository } from '../domain/capture-repository';

export type SaveCaptureDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

export function saveCapture(
  deps: SaveCaptureDeps,
  draft: CaptureDraft,
): Promise<Result<void, CaptureError>> {
  return deps.captures.save(takenCapture(draft, deps.now()));
}
