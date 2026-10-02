import { isPersisted, storageEstimate } from '$lib/platform/storage/persistence';
import type { BookId } from '$lib/shared/ids';
import type { LibraryRepository } from '../domains/library/domain/book/library-repository';
import type { RemovedShelf } from '../domains/library/domain/book/removed-book';
import { listRemovedShelf } from '../domains/library/use-cases/list-removed-shelf';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { createOriginStores } from '../domains/storage/adapters/browser-origin-stores';
import { deleteRemovedBookCaptures } from '../domains/storage/use-cases/delete-removed-book-captures';
import type { DeleteRemovedBookCapturesResult } from '../domains/storage/use-cases/delete-removed-book-captures';
import { removeBookAndCaptures } from '../domains/storage/use-cases/remove-book-and-captures';
import type { RemoveBookAndCapturesResult } from '../domains/storage/use-cases/remove-book-and-captures';
import { readStorageAccount } from '../domains/storage/use-cases/read-storage-account';
import type { ReadStorageAccountResult } from '../domains/storage/use-cases/read-storage-account';

type StorageUseCases = {
  readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
};

type RemovedBooks = {
  readonly listRemovedBooks: () => Promise<RemovedShelf>;
  readonly deleteRemovedBookCaptures: (id: BookId) => Promise<DeleteRemovedBookCapturesResult>;
  readonly removeBookAndCaptures: (id: BookId) => Promise<RemoveBookAndCapturesResult>;
};

function buildStorage(): StorageUseCases {
  const stores = createOriginStores();

  return {
    readStorageAccount: () =>
      readStorageAccount({ stores, estimate: storageEstimate, persisted: isPersisted }),
  };
}

function buildRemovedBooks(
  repository: LibraryRepository,
  captures: CaptureRepository,
): RemovedBooks {
  return {
    listRemovedBooks: () => listRemovedShelf({ repository }),
    deleteRemovedBookCaptures: (id: BookId) =>
      deleteRemovedBookCaptures({ clearing: { captures }, forgetting: { repository } }, id),
    removeBookAndCaptures: (id: BookId) =>
      removeBookAndCaptures(
        { removing: { repository }, clearing: { captures }, forgetting: { repository } },
        id,
      ),
  };
}

export { buildStorage, buildRemovedBooks };
export type { StorageUseCases, RemovedBooks };
