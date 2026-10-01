import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';

type MarkFinishedResult =
  | { readonly kind: 'success'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | StorageUnavailable;

type MarkFinishedDeps = {
  readonly repository: LibraryRepository;
  readonly now: () => number;
};

async function markFinished(deps: MarkFinishedDeps, id: BookId): Promise<MarkFinishedResult> {
  const updated = await deps.repository.update(id, { finishedAt: deps.now() });
  if (updated.kind !== 'success') return updated;
  if (updated.book === null) return { kind: 'not-found', id };
  return { kind: 'success', book: updated.book };
}

export { markFinished };
export type { MarkFinishedDeps, MarkFinishedResult };
