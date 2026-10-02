import { forgetRemovedBook } from '$lib/domains/library/use-cases/forget-removed-book';
import type { ForgetRemovedBookDeps } from '$lib/domains/library/use-cases/forget-removed-book';
import { clearCaptures } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesDeps } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type DeleteRemovedBookCapturesResult = { readonly kind: 'success' } | StorageUnavailable;

type DeleteRemovedBookCapturesDeps = {
  readonly clearing: ClearCapturesDeps;
  readonly forgetting: ForgetRemovedBookDeps;
};

async function deleteRemovedBookCaptures(
  deps: DeleteRemovedBookCapturesDeps,
  id: BookId,
): Promise<DeleteRemovedBookCapturesResult> {
  const cleared = await clearCaptures(deps.clearing, id);
  if (cleared.kind !== 'success') return cleared;

  return forgetRemovedBook(deps.forgetting, id);
}

export { deleteRemovedBookCaptures };
export type { DeleteRemovedBookCapturesDeps, DeleteRemovedBookCapturesResult };
