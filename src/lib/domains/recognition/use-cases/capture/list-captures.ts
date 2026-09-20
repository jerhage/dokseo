import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

type ListCapturesDeps = {
  readonly captures: CaptureRepository;
};

function listCaptures(
  deps: ListCapturesDeps,
  book: BookId,
): Promise<Result<readonly Capture[], CaptureError>> {
  return deps.captures.listForBook(book);
}

export { listCaptures };
export type { ListCapturesDeps };
