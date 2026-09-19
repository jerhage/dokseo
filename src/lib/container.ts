import { match } from 'ts-pattern';
import { requestPersistence, storageEstimate } from '$lib/platform/storage/persistence';
import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import type { BookId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { createFileSourceBuilder } from './domains/library/adapters/file-source-builder';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import { openStoredPageSource } from './domains/library/adapters/stored-page-source';
import type { Book, BookEdit } from './domains/library/domain/book';
import type { LibraryError } from './domains/library/domain/library-repository';
import { editBook, type EditBookDeps } from './domains/library/use-cases/edit-book';
import { listBooks, type ListBooksDeps } from './domains/library/use-cases/list-books';
import {
  openFile,
  type OpenFileDeps,
  type OpenFileError,
} from './domains/library/use-cases/open-file';
import {
  openForReading,
  type OpenedBook,
  type OpenForReadingDeps,
  type OpenForReadingError,
} from './domains/library/use-cases/open-for-reading';
import { readCover, type ReadCoverDeps } from './domains/library/use-cases/read-cover';
import {
  readStorageUsage,
  type ReadStorageUsageDeps,
} from './domains/library/use-cases/read-storage-usage';
import { removeBook, type RemoveBookDeps } from './domains/library/use-cases/remove-book';
import { createCanvasCropper } from './domains/recognition/adapters/canvas-cropper';
import type { RecognizedText } from './domains/recognition/domain/recognized-text';
import type { TextRecognizer } from './domains/recognition/domain/text-recognizer';
import {
  recognizeRegion,
  type RecognizeRegionError,
} from './domains/recognition/use-cases/recognize-region';

async function loadFakeRecognizer(): Promise<TextRecognizer> {
  const { createFakeRecognizer } = await import('./domains/recognition/adapters/fake-recognizer');
  return createFakeRecognizer();
}

function recognizerFor(language: Language): Promise<TextRecognizer> {
  return match(language).with('ja', loadFakeRecognizer).with('ko', loadFakeRecognizer).exhaustive();
}

export type Container = {
  readonly library: {
    readonly openFile: (files: readonly File[]) => Promise<Result<Book, OpenFileError>>;
    readonly openForReading: (id: BookId) => Promise<Result<OpenedBook, OpenForReadingError>>;
    readonly listBooks: () => Promise<Result<readonly Book[], LibraryError>>;
    readonly readCover: (id: BookId) => Promise<Result<Blob, LibraryError>>;
    readonly removeBook: (id: BookId) => Promise<Result<void, LibraryError>>;
    readonly editBook: (id: BookId, edit: BookEdit) => Promise<Result<Book, LibraryError>>;
    readonly readStorageUsage: () => Promise<{ usage: number; quota: number } | null>;
  };
  readonly recognition: {
    readonly recognizeRegion: (
      language: Language,
      source: PageSource,
      regions: readonly ImageRegion[],
      arrangement: Arrangement,
    ) => Promise<Result<RecognizedText, RecognizeRegionError>>;
  };
};

export function buildContainer(): Container {
  const repository = createLibraryRepository();

  const openFileDeps: OpenFileDeps = {
    repository,
    builder: createFileSourceBuilder(),
    requestPersistence,
    now: Date.now,
    newId: () => crypto.randomUUID(),
  };

  const openForReadingDeps: OpenForReadingDeps = { repository, openPages: openStoredPageSource };
  const listBooksDeps: ListBooksDeps = { repository };
  const readCoverDeps: ReadCoverDeps = { repository };
  const removeBookDeps: RemoveBookDeps = { repository };
  const editBookDeps: EditBookDeps = { repository };
  const readStorageUsageDeps: ReadStorageUsageDeps = { estimate: storageEstimate };
  const cropper = createCanvasCropper(beginTrace);

  return {
    library: {
      openFile: (files: readonly File[]) => openFile(openFileDeps, files),
      openForReading: (id: BookId) => openForReading(openForReadingDeps, id),
      listBooks: () => listBooks(listBooksDeps),
      readCover: (id: BookId) => readCover(readCoverDeps, id),
      removeBook: (id: BookId) => removeBook(removeBookDeps, id),
      editBook: (id: BookId, edit: BookEdit) => editBook(editBookDeps, id, edit),
      readStorageUsage: () => readStorageUsage(readStorageUsageDeps),
    },
    recognition: {
      recognizeRegion: async (
        language: Language,
        source: PageSource,
        regions: readonly ImageRegion[],
        arrangement: Arrangement,
      ) => {
        const recognizer = await recognizerFor(language);
        return recognizeRegion({ cropper, recognizer, beginTrace }, source, regions, arrangement);
      },
    },
  };
}
