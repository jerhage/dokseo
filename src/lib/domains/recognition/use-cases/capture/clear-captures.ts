import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ClearCapturesResult = { readonly kind: 'success' } | StorageUnavailable;

type ClearCapturesDeps = {
  readonly captures: CaptureRepository;
};

function clearCaptures(deps: ClearCapturesDeps, book: BookId): Promise<ClearCapturesResult> {
  return deps.captures.clearBook(book);
}

export { clearCaptures };
export type { ClearCapturesDeps, ClearCapturesResult };
