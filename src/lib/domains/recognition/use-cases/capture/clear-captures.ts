import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type ClearCapturesDeps = {
  readonly captures: CaptureRepository;
};

function clearCaptures(deps: ClearCapturesDeps, book: BookId): Promise<Result<void, CaptureError>> {
  return deps.captures.clearBook(book);
}

export { clearCaptures };
export type { ClearCapturesDeps };
