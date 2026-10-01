import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type SavePageListResult = { readonly kind: 'success' } | StorageUnavailable;

type SavePageListDeps = {
  readonly repository: LibraryRepository;
};

function savePageList(
  deps: SavePageListDeps,
  id: BookId,
  names: readonly string[],
): Promise<SavePageListResult> {
  return deps.repository.savePageList(id, names);
}

export { savePageList };
export type { SavePageListDeps, SavePageListResult };
