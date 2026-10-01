import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type SaveCaptureResult =
  | { readonly kind: 'success'; readonly capture: Capture }
  | StorageUnavailable;

type SaveCaptureDeps = {
  readonly captures: CaptureRepository;
  readonly now: () => number;
};

async function saveCapture(deps: SaveCaptureDeps, draft: CaptureDraft): Promise<SaveCaptureResult> {
  const capture = takenCapture(draft, deps.now());
  const stored = await deps.captures.save(capture);
  if (stored.kind !== 'success') return stored;

  return { kind: 'success', capture };
}

export { saveCapture };
export type { SaveCaptureDeps, SaveCaptureResult };
