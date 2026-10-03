import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { RemovedBook } from '../domain/book/removed-book';

type ListRestorableBooksResult =
  | {
      readonly kind: 'success';
      readonly removed: readonly RemovedBook[];
      readonly unreadable: readonly RemovedBook[];
    }
  | StorageUnavailable;

type ListRestorableBooksDeps = {
  readonly repository: LibraryRepository;
};

function listRestorableBooks(deps: ListRestorableBooksDeps): Promise<ListRestorableBooksResult> {
  return deps.repository.listRestorable();
}

export { listRestorableBooks };
export type { ListRestorableBooksDeps, ListRestorableBooksResult };
