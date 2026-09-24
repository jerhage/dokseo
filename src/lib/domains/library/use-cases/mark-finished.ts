import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type MarkFinishedDeps = {
  readonly repository: LibraryRepository;
  readonly now: () => number;
};

function markFinished(deps: MarkFinishedDeps, id: BookId): Promise<Result<Book, LibraryError>> {
  return deps.repository.update(id, { finishedAt: deps.now() });
}

export { markFinished };
export type { MarkFinishedDeps };
