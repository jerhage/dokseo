import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { RemovedBook } from '../domain/book/removed-book';

type AddRemovedBookResult = { readonly kind: 'success' } | StorageUnavailable;

type AddRemovedBookDeps = {
  readonly repository: LibraryRepository;
};

function addRemovedBook(
  deps: AddRemovedBookDeps,
  book: RemovedBook,
): Promise<AddRemovedBookResult> {
  return deps.repository.addRemoved(book);
}

export { addRemovedBook };
export type { AddRemovedBookDeps, AddRemovedBookResult };
