import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Capture, UnreadableCapture } from '../../domain/capture/capture';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ListCapturesResult =
  | {
      readonly kind: 'success';
      readonly captures: readonly Capture[];
      readonly unreadable: readonly UnreadableCapture[];
    }
  | StorageUnavailable;

type ListCapturesDeps = {
  readonly captures: CaptureRepository;
};

function listCaptures(deps: ListCapturesDeps, book: BookId): Promise<ListCapturesResult> {
  return deps.captures.listForBook(book);
}

export { listCaptures };
export type { ListCapturesDeps, ListCapturesResult };
