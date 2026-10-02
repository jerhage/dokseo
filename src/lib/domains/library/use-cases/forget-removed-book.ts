import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type ForgetRemovedBookResult = { readonly kind: 'success' } | StorageUnavailable;

type ForgetRemovedBookDeps = {
  readonly repository: LibraryRepository;
};

function forgetRemovedBook(
  deps: ForgetRemovedBookDeps,
  id: BookId,
): Promise<ForgetRemovedBookResult> {
  return deps.repository.forgetRemoved(id);
}

export { forgetRemovedBook };
export type { ForgetRemovedBookDeps, ForgetRemovedBookResult };
