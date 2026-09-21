import type { LibraryError } from '$lib/domains/library/domain/book/library-repository';
import { removeBook } from '$lib/domains/library/use-cases/remove-book';
import type { RemoveBookDeps } from '$lib/domains/library/use-cases/remove-book';
import type { CaptureError } from '$lib/domains/recognition/domain/capture/capture-repository';
import { clearCaptures } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesDeps } from '$lib/domains/recognition/use-cases/capture/clear-captures';
import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';

type RemoveBookAndCapturesDeps = {
  readonly clearing: ClearCapturesDeps;
  readonly removal: RemoveBookDeps;
};

async function removeBookAndCaptures(
  deps: RemoveBookAndCapturesDeps,
  id: BookId,
): Promise<Result<void, LibraryError | CaptureError>> {
  const cleared = await clearCaptures(deps.clearing, id);
  if (!cleared.ok) return cleared;

  return removeBook(deps.removal, id);
}

export { removeBookAndCaptures };
export type { RemoveBookAndCapturesDeps };
