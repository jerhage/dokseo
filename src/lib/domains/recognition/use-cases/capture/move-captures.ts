import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type MoveCapturesResult = { readonly kind: 'success' } | StorageUnavailable;

type MoveCapturesDeps = {
  readonly captures: CaptureRepository;
};

function moveCaptures(
  deps: MoveCapturesDeps,
  from: BookId,
  to: BookId,
): Promise<MoveCapturesResult> {
  return deps.captures.moveBook(from, to);
}

export { moveCaptures };
export type { MoveCapturesDeps, MoveCapturesResult };
