import type { Result } from '$lib/shared/result';
import type { Capture } from '../domain/capture';
import type { CaptureError, CaptureRepository } from '../domain/capture-repository';

export type ListEveryCaptureDeps = {
  readonly captures: CaptureRepository;
};

export function listEveryCapture(
  deps: ListEveryCaptureDeps,
): Promise<Result<readonly Capture[], CaptureError>> {
  return deps.captures.listEverything();
}
