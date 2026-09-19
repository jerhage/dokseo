import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';

export type EditBookDeps = {
  readonly repository: LibraryRepository;
};

export function editBook(
  deps: EditBookDeps,
  id: BookId,
  edit: BookEdit,
): Promise<Result<Book, LibraryError>> {
  return deps.repository.update(id, edit);
}
