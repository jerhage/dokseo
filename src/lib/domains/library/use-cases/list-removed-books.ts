import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { RemovedBook, UnreadableRemovedBook } from '../domain/book/removed-book';

type ListRemovedBooksResult =
  | {
      readonly kind: 'success';
      readonly removed: readonly RemovedBook[];
      readonly unreadable: readonly UnreadableRemovedBook[];
    }
  | StorageUnavailable;

type ListRemovedBooksDeps = {
  readonly repository: LibraryRepository;
};

function listRemovedBooks(deps: ListRemovedBooksDeps): Promise<ListRemovedBooksResult> {
  return deps.repository.listRemoved();
}

export { listRemovedBooks };
export type { ListRemovedBooksDeps, ListRemovedBooksResult };
