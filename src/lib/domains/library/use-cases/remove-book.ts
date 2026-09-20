import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

export type RemoveBookDeps = {
  readonly repository: LibraryRepository;
};

export function removeBook(deps: RemoveBookDeps, id: BookId): Promise<Result<void, LibraryError>> {
  return deps.repository.remove(id);
}
