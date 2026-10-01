import { removeBook } from '$lib/domains/library/use-cases/remove-book';
import type { RemoveBookDeps } from '$lib/domains/library/use-cases/remove-book';
import { clearCaptures } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesDeps } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type RemoveBookAndCapturesResult = { readonly kind: 'success' } | StorageUnavailable;

type RemoveBookAndCapturesDeps = {
  readonly clearing: ClearCapturesDeps;
  readonly removal: RemoveBookDeps;
};

async function removeBookAndCaptures(
  deps: RemoveBookAndCapturesDeps,
  id: BookId,
): Promise<RemoveBookAndCapturesResult> {
  const cleared = await clearCaptures(deps.clearing, id);
  if (!cleared.ok) {
    if (cleared.error.kind === 'storage-unavailable') return STORAGE_UNAVAILABLE;
    throw new Error(cleared.error.cause);
  }

  return removeBook(deps.removal, id);
}

export { removeBookAndCaptures };
export type { RemoveBookAndCapturesDeps, RemoveBookAndCapturesResult };
