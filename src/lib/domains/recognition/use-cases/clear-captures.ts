import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { CaptureError, CaptureRepository } from '../domain/capture-repository';

export type ClearCapturesDeps = {
  readonly captures: CaptureRepository;
};

export function clearCaptures(
  deps: ClearCapturesDeps,
  book: BookId,
): Promise<Result<void, CaptureError>> {
  return deps.captures.clearBook(book);
}
