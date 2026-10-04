import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { startingPlace } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';

type MarkUnreadResult =
  | { readonly kind: 'success'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | StorageUnavailable;

type MarkUnreadDeps = {
  readonly repository: LibraryRepository;
};

async function markUnread(deps: MarkUnreadDeps, id: BookId): Promise<MarkUnreadResult> {
  const found = await deps.repository.get(id);
  if (found.kind === 'unreadable-book') {
    throw new Error(`The book ${id} is stored in a shape this version cannot read`);
  }
  if (found.kind !== 'success') return found;
  if (found.book === null) return { kind: 'not-found', id };

  const updated = await deps.repository.update(id, {
    finishedAt: null,
    lastReadAt: null,
    position: startingPlace(found.book),
  });
  if (updated.kind !== 'success') return updated;
  if (updated.book === null) return { kind: 'not-found', id };
  return { kind: 'success', book: updated.book };
}

export { markUnread };
export type { MarkUnreadDeps, MarkUnreadResult };
