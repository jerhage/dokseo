import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type ListBooksDeps = {
  readonly repository: LibraryRepository;
};

function listBooks(deps: ListBooksDeps): Promise<Result<readonly Book[], LibraryError>> {
  return deps.repository.list();
}

export { listBooks };
export type { ListBooksDeps };
