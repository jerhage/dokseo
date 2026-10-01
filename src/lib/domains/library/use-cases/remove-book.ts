import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type RemoveBookResult = { readonly kind: 'success' } | StorageUnavailable;

type RemoveBookDeps = {
  readonly repository: LibraryRepository;
};

function removeBook(deps: RemoveBookDeps, id: BookId): Promise<RemoveBookResult> {
  return deps.repository.remove(id);
}

export { removeBook };
export type { RemoveBookDeps, RemoveBookResult };
