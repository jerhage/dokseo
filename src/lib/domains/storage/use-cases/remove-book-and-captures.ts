import { forgetRemovedBook } from '$lib/domains/library/use-cases/forget-removed-book';
import type { ForgetRemovedBookDeps } from '$lib/domains/library/use-cases/forget-removed-book';
import { removeBook } from '$lib/domains/library/use-cases/remove-book';
import type { RemoveBookDeps } from '$lib/domains/library/use-cases/remove-book';
import { clearCaptures } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesDeps } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type RemoveBookAndCapturesResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'partly-removed' }
  | StorageUnavailable;

type RemoveBookAndCapturesDeps = {
  readonly removing: RemoveBookDeps;
  readonly clearing: ClearCapturesDeps;
  readonly forgetting: ForgetRemovedBookDeps;
};

const PARTLY_REMOVED: RemoveBookAndCapturesResult = { kind: 'partly-removed' };

async function removeBookAndCaptures(
  deps: RemoveBookAndCapturesDeps,
  id: BookId,
): Promise<RemoveBookAndCapturesResult> {
  const removed = await removeBook(deps.removing, id);
  if (removed.kind !== 'success') return removed;
  const cleared = await clearCaptures(deps.clearing, id);
  if (cleared.kind !== 'success') return PARTLY_REMOVED;
  const forgotten = await forgetRemovedBook(deps.forgetting, id);
  if (forgotten.kind !== 'success') return PARTLY_REMOVED;

  return forgotten;
}

export { removeBookAndCaptures };
export type { RemoveBookAndCapturesDeps, RemoveBookAndCapturesResult };
