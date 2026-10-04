import { isPersisted, storageEstimate } from '$lib/platform/storage/persistence';
import { APP_VERSION } from '$lib/shared/app-version';
import type { BookId } from '$lib/shared/ids';
import type { LibraryRepository } from '../domains/library/domain/book/library-repository';
import type { RemovedShelf } from '../domains/library/domain/book/removed-book';
import { listRemovedShelf } from '../domains/library/use-cases/list-removed-shelf';
import { createTagRepository } from '../domains/recognition/adapters/tag/indexeddb-tags.repo';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { createOriginStores } from '../domains/storage/adapters/browser-origin-stores';
import { applyCapturesImport } from '../domains/storage/use-cases/apply-captures-import';
import type {
  ApplyCapturesImportResult,
  ConflictResolution,
} from '../domains/storage/use-cases/apply-captures-import';
import type { CapturesImportPlan } from '../domains/storage/use-cases/captures-import-plan';
import { deleteRemovedBookCaptures } from '../domains/storage/use-cases/delete-removed-book-captures';
import type { DeleteRemovedBookCapturesResult } from '../domains/storage/use-cases/delete-removed-book-captures';
import { exportBookCaptures } from '../domains/storage/use-cases/export-book-captures';
import type { ExportBookCapturesResult } from '../domains/storage/use-cases/export-book-captures';
import { exportCaptures } from '../domains/storage/use-cases/export-captures';
import type { ExportCapturesResult } from '../domains/storage/use-cases/export-captures';
import { mergeIntoBook } from '../domains/storage/use-cases/merge-into-book';
import type { MergeIntoBookResult } from '../domains/storage/use-cases/merge-into-book';
import { removeBookAndCaptures } from '../domains/storage/use-cases/remove-book-and-captures';
import type { RemoveBookAndCapturesResult } from '../domains/storage/use-cases/remove-book-and-captures';
import { previewCapturesImport } from '../domains/storage/use-cases/preview-captures-import';
import type { PreviewCapturesImportResult } from '../domains/storage/use-cases/preview-captures-import';
import { readStorageAccount } from '../domains/storage/use-cases/read-storage-account';
import type { ReadStorageAccountResult } from '../domains/storage/use-cases/read-storage-account';

type StorageUseCases = {
  readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
};

type CapturesExports = {
  readonly exportCaptures: () => Promise<ExportCapturesResult>;
};

type BookCapturesExports = {
  readonly exportBookCaptures: (id: BookId) => Promise<ExportBookCapturesResult>;
};

type CapturesImports = {
  readonly previewCapturesImport: (text: string) => Promise<PreviewCapturesImportResult>;
  readonly applyCapturesImport: (
    plan: CapturesImportPlan,
    resolution: ConflictResolution,
  ) => Promise<ApplyCapturesImportResult>;
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

function buildBookCapturesExports(
  repository: LibraryRepository,
  captures: CaptureRepository,
): BookCapturesExports {
  const tags = createTagRepository();

  return {
    exportBookCaptures: (id: BookId) =>
      exportBookCaptures(
        {
          shelf: { repository },
          removed: { repository },
          tags: { tags },
          captures: { captures },
          now: Date.now,
          appVersion: APP_VERSION,
        },
        id,
      ),
  };
}

function buildCapturesImports(
  repository: LibraryRepository,
  captures: CaptureRepository,
): CapturesImports {
  const tags = createTagRepository();

  return {
    previewCapturesImport: (text: string) =>
      previewCapturesImport(
        {
          shelf: { repository },
          restorable: { repository },
          tags: { tags },
          captures: { captures },
          newId: () => crypto.randomUUID(),
          now: Date.now,
        },
        text,
      ),
    applyCapturesImport: (plan: CapturesImportPlan, resolution: ConflictResolution) =>
      applyCapturesImport(
        {
          holding: { repository },
          tagging: { tags },
          saving: { captures },
          now: Date.now,
        },
        plan,
        resolution,
      ),
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
        {
          removing: { repository, now: Date.now },
          clearing: { captures },
          forgetting: { repository },
        },
        id,
      ),
    mergeIntoBook: (into: BookId, strays: readonly BookId[]) =>
      mergeIntoBook(
        {
          moving: { captures },
          removing: { repository, now: Date.now },
          forgetting: { repository },
        },
        into,
        strays,
      ),
  };
}

export {
  buildStorage,
  buildBookCapturesExports,
  buildCapturesExports,
  buildCapturesImports,
  buildRemovedBooks,
};
export type {
  StorageUseCases,
  BookCapturesExports,
  CapturesExports,
  CapturesImports,
  RemovedBooks,
};
