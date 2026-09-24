import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import { startingPlace } from '../domain/book/book';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type MarkUnreadDeps = {
  readonly repository: LibraryRepository;
};

async function markUnread(deps: MarkUnreadDeps, id: BookId): Promise<Result<Book, LibraryError>> {
  const found = await deps.repository.get(id);
  if (!found.ok) return found;

  return deps.repository.update(id, {
    finishedAt: null,
    position: startingPlace(found.value),
  });
}

export { markUnread };
export type { MarkUnreadDeps };
