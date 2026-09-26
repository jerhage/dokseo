import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type RestoreCaptureDeps = {
  readonly captures: CaptureRepository;
};

function restoreCapture(
  deps: RestoreCaptureDeps,
  capture: Capture,
): Promise<Result<void, CaptureError>> {
  return deps.captures.save(capture);
}

export { restoreCapture };
export type { RestoreCaptureDeps };
