import { match } from 'ts-pattern';
import { requestPersistence, storageEstimate } from '$lib/platform/storage/persistence';
import { beginTrace, type TraceFactory } from '$lib/platform/trace/pipeline-trace';
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
import { createCaptureRepository } from './domains/recognition/adapters/indexeddb-captures.repo';
import { createModelConsentStore } from './domains/recognition/adapters/indexeddb-model-consent';
import type { Capture, CaptureDraft } from './domains/recognition/domain/capture';
import type { CaptureError } from './domains/recognition/domain/capture-repository';
import type {
  ModelConsentDecision,
  ModelConsentError,
} from './domains/recognition/domain/model-consent';
import type { RecognizedText } from './domains/recognition/domain/recognized-text';
import type { TextRecognizer } from './domains/recognition/domain/text-recognizer';
import {
  clearCaptures,
  type ClearCapturesDeps,
} from './domains/recognition/use-cases/clear-captures';
import {
  grantModelConsent,
  type GrantModelConsentDeps,
} from './domains/recognition/use-cases/grant-model-consent';
import { listCaptures, type ListCapturesDeps } from './domains/recognition/use-cases/list-captures';
import {
  readModelConsent,
  type ReadModelConsentDeps,
} from './domains/recognition/use-cases/read-model-consent';
import {
  recognizeRegion,
  type RecognizeRegionError,
} from './domains/recognition/use-cases/recognize-region';
import { saveCapture, type SaveCaptureDeps } from './domains/recognition/use-cases/save-capture';

export type RecognitionProgress = (fraction: number) => void;

const progressListeners = new Map<Language, Set<RecognitionProgress>>();

function progressFor(language: Language): Set<RecognitionProgress> {
  const held = progressListeners.get(language);
  if (held !== undefined) return held;

  const opened = new Set<RecognitionProgress>();
  progressListeners.set(language, opened);
  return opened;
}

async function loadFakeRecognizer(): Promise<TextRecognizer> {
  const { createFakeRecognizer } = await import('./domains/recognition/adapters/fake-recognizer');
  return createFakeRecognizer();
}

async function loadMangaOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createMangaOcrRecognizer } =
    await import('./domains/recognition/adapters/manga-ocr.adapter');
  return createMangaOcrRecognizer({
    onProgress: (fraction) => {
      for (const report of progressFor(language)) report(fraction);
    },
  });
}

const recognizers = new Map<Language, Promise<TextRecognizer>>();

export function recognizerFor(language: Language): Promise<TextRecognizer> {
  const held = recognizers.get(language);
  if (held !== undefined) return held;

  const loading = match(language)
    .with('ja', loadMangaOcrRecognizer)
    .with('ko', loadFakeRecognizer)
    .exhaustive()
    .catch((cause: unknown): never => {
      recognizers.delete(language);
      throw cause;
    });

  recognizers.set(language, loading);
  return loading;
}

export type Container = {
  readonly beginTrace: TraceFactory;
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
    readonly readModelConsent: (
      language: Language,
    ) => Promise<Result<ModelConsentDecision, ModelConsentError>>;
    readonly grantModelConsent: (language: Language) => Promise<Result<void, ModelConsentError>>;
    readonly recognizeRegion: (
      language: Language,
      source: PageSource,
      regions: readonly ImageRegion[],
      arrangement: Arrangement,
      onProgress?: RecognitionProgress,
    ) => Promise<Result<RecognizedText, RecognizeRegionError>>;
    readonly listCaptures: (book: BookId) => Promise<Result<readonly Capture[], CaptureError>>;
    readonly saveCapture: (draft: CaptureDraft) => Promise<Result<void, CaptureError>>;
    readonly clearCaptures: (book: BookId) => Promise<Result<void, CaptureError>>;
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
  const consent = createModelConsentStore();
  const readModelConsentDeps: ReadModelConsentDeps = { consent };
  const grantModelConsentDeps: GrantModelConsentDeps = { consent, requestPersistence };
  const captures = createCaptureRepository();
  const listCapturesDeps: ListCapturesDeps = { captures };
  const saveCaptureDeps: SaveCaptureDeps = { captures, now: Date.now };
  const clearCapturesDeps: ClearCapturesDeps = { captures };

  return {
    beginTrace,
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
      readModelConsent: (language: Language) => readModelConsent(readModelConsentDeps, language),
      grantModelConsent: (language: Language) => grantModelConsent(grantModelConsentDeps, language),
      recognizeRegion: async (
        language: Language,
        source: PageSource,
        regions: readonly ImageRegion[],
        arrangement: Arrangement,
        onProgress?: RecognitionProgress,
      ) => {
        const listening = progressFor(language);
        if (onProgress !== undefined) listening.add(onProgress);

        try {
          const recognizer = await recognizerFor(language);
          const read = await recognizeRegion(
            { cropper, recognizer, beginTrace },
            source,
            regions,
            arrangement,
          );
          return read;
        } finally {
          if (onProgress !== undefined) listening.delete(onProgress);
        }
      },
      listCaptures: (book: BookId) => listCaptures(listCapturesDeps, book),
      saveCapture: (draft: CaptureDraft) => saveCapture(saveCaptureDeps, draft),
      clearCaptures: (book: BookId) => clearCaptures(clearCapturesDeps, book),
    },
  };
}
