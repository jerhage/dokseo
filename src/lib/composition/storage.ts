import { isPersisted, storageEstimate } from '$lib/platform/storage/persistence';
import { APP_VERSION } from '$lib/shared/app-version';
import type { BookId } from '$lib/shared/ids';
import type { LibraryRepository } from '../domains/library/domain/book/library-repository';
import type { RemovedShelf } from '../domains/library/domain/book/removed-book';
import { listRemovedShelf } from '../domains/library/use-cases/list-removed-shelf';
import { createTagRepository } from '../domains/recognition/adapters/tag/indexeddb-tags.repo';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { createOriginStores } from '../domains/storage/adapters/browser-origin-stores';
import { deleteRemovedBookCaptures } from '../domains/storage/use-cases/delete-removed-book-captures';
import type { DeleteRemovedBookCapturesResult } from '../domains/storage/use-cases/delete-removed-book-captures';
import { exportCaptures } from '../domains/storage/use-cases/export-captures';
import type { ExportCapturesResult } from '../domains/storage/use-cases/export-captures';
import { mergeIntoBook } from '../domains/storage/use-cases/merge-into-book';
import type { MergeIntoBookResult } from '../domains/storage/use-cases/merge-into-book';
import { removeBookAndCaptures } from '../domains/storage/use-cases/remove-book-and-captures';
import type { RemoveBookAndCapturesResult } from '../domains/storage/use-cases/remove-book-and-captures';
import { readStorageAccount } from '../domains/storage/use-cases/read-storage-account';
import type { ReadStorageAccountResult } from '../domains/storage/use-cases/read-storage-account';

type StorageUseCases = {
  readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
};

type CapturesExports = {
  readonly exportCaptures: () => Promise<ExportCapturesResult>;
};

type RemovedBooks = {
  readonly listRemovedBooks: () => Promise<RemovedShelf>;
  readonly deleteRemovedBookCaptures: (id: BookId) => Promise<DeleteRemovedBookCapturesResult>;
  readonly removeBookAndCaptures: (id: BookId) => Promise<RemoveBookAndCapturesResult>;
  readonly mergeIntoBook: (into: BookId, strays: readonly BookId[]) => Promise<MergeIntoBookResult>;
};

function buildStorage(): StorageUseCases {
  const stores = createOriginStores();

  return {
    readStorageAccount: () =>
      readStorageAccount({ stores, estimate: storageEstimate, persisted: isPersisted }),
  };
}

function buildCapturesExports(
  repository: LibraryRepository,
  captures: CaptureRepository,
): CapturesExports {
  const tags = createTagRepository();

  return {
    exportCaptures: () =>
      exportCaptures({
        shelf: { repository },
        removed: { repository },
        tags: { tags },
        captures: { captures },
        now: Date.now,
        appVersion: APP_VERSION,
      }),
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
    mergeIntoBook: (into: BookId, strays: readonly BookId[]) =>
      mergeIntoBook(
        { moving: { captures }, removing: { repository }, forgetting: { repository } },
        into,
        strays,
      ),
  };
}

export { buildStorage, buildCapturesExports, buildRemovedBooks };
export type { StorageUseCases, CapturesExports, RemovedBooks };
