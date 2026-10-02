import { isPersisted, storageEstimate } from '$lib/platform/storage/persistence';
import type { BookId } from '$lib/shared/ids';
import { createOriginStores } from '../domains/storage/adapters/browser-origin-stores';
import { readStorageAccount } from '../domains/storage/use-cases/read-storage-account';
import type { ReadStorageAccountResult } from '../domains/storage/use-cases/read-storage-account';
import { removeBookAndCaptures } from '../domains/storage/use-cases/remove-book-and-captures';
import type {
  RemoveBookAndCapturesDeps,
  RemoveBookAndCapturesResult,
} from '../domains/storage/use-cases/remove-book-and-captures';

type StorageUseCases = {
  readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
};

type BookRemoval = {
  readonly removeBook: (id: BookId) => Promise<RemoveBookAndCapturesResult>;
};

function buildStorage(): StorageUseCases {
  const stores = createOriginStores();

  return {
    readStorageAccount: () =>
      readStorageAccount({ stores, estimate: storageEstimate, persisted: isPersisted }),
  };
}

function buildBookRemoval(deps: RemoveBookAndCapturesDeps): BookRemoval {
  return {
    removeBook: (id: BookId) => removeBookAndCaptures(deps, id),
  };
}

export { buildStorage, buildBookRemoval };
export type { StorageUseCases, BookRemoval };
