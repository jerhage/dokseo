import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type ReadBookDeps = {
  readonly repository: LibraryRepository;
};

function readBook(deps: ReadBookDeps, id: BookId): Promise<Result<Book, LibraryError>> {
  return deps.repository.get(id);
}

export { readBook };
export type { ReadBookDeps };
