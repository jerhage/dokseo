import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { UnreadableBook } from '../domain/book/stored-book';

type ListBooksResult =
  | {
      readonly kind: 'success';
      readonly books: readonly Book[];
      readonly unreadable: readonly UnreadableBook[];
    }
  | StorageUnavailable;

type ListBooksDeps = {
  readonly repository: LibraryRepository;
};

function listBooks(deps: ListBooksDeps): Promise<ListBooksResult> {
  return deps.repository.list();
}

export { listBooks };
export type { ListBooksDeps, ListBooksResult };
