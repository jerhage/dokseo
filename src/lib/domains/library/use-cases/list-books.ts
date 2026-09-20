import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

export type ListBooksDeps = {
  readonly repository: LibraryRepository;
};

export function listBooks(deps: ListBooksDeps): Promise<Result<readonly Book[], LibraryError>> {
  return deps.repository.list();
}
