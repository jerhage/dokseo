import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type ListEveryCaptureDeps = {
  readonly captures: CaptureRepository;
};

function listEveryCapture(
  deps: ListEveryCaptureDeps,
): Promise<Result<readonly Capture[], CaptureError>> {
  return deps.captures.listEverything();
}

export { listEveryCapture };
export type { ListEveryCaptureDeps };
