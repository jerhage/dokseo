import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError, CaptureRepository } from '../../domain/capture/capture-repository';

export type ListCapturesDeps = {
  readonly captures: CaptureRepository;
};

export function listCaptures(
  deps: ListCapturesDeps,
  book: BookId,
): Promise<Result<readonly Capture[], CaptureError>> {
  return deps.captures.listForBook(book);
}
