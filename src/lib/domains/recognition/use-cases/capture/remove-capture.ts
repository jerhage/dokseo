import type { CaptureId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type RemoveCaptureDeps = {
  readonly captures: CaptureRepository;
};

function removeCapture(
  deps: RemoveCaptureDeps,
  capture: CaptureId,
): Promise<Result<void, CaptureError>> {
  return deps.captures.remove(capture);
}

export { removeCapture };
export type { RemoveCaptureDeps };
