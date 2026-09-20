import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type RemoveBookDeps = {
  readonly repository: LibraryRepository;
};

function removeBook(deps: RemoveBookDeps, id: BookId): Promise<Result<void, LibraryError>> {
  return deps.repository.remove(id);
}

export { removeBook };
export type { RemoveBookDeps };
