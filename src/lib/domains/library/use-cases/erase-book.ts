import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type EraseBookResult = { readonly kind: 'success' } | StorageUnavailable;

type EraseBookDeps = {
  readonly repository: LibraryRepository;
};

function eraseBook(deps: EraseBookDeps, id: BookId): Promise<EraseBookResult> {
  return deps.repository.erase(id);
}

export { eraseBook };
export type { EraseBookDeps, EraseBookResult };
