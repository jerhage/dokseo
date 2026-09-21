import { match } from 'ts-pattern';
import { probeGpu } from '$lib/platform/gpu/adapter-probe';
import {
  isPersisted,
  requestPersistence,
  storageEstimate,
} from '$lib/platform/storage/persistence';
import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';
import { createFileSourceBuilder } from './domains/library/adapters/file-source-builder';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import { openStoredPageSource } from './domains/library/adapters/stored-page-source';
import type { Book, BookEdit } from './domains/library/domain/book/book';
import type { LibraryError } from './domains/library/domain/book/library-repository';
import type { UploadReport } from './domains/library/domain/ingest/upload-progress';
import { editBook } from './domains/library/use-cases/edit-book';
import type { EditBookDeps } from './domains/library/use-cases/edit-book';
import { listBooks } from './domains/library/use-cases/list-books';
import type { ListBooksDeps } from './domains/library/use-cases/list-books';
import { openFile } from './domains/library/use-cases/open-file';
import type { OpenFileDeps, OpenFileError } from './domains/library/use-cases/open-file';
import { openForReading } from './domains/library/use-cases/open-for-reading';
import type {
  OpenedBook,
  OpenForReadingDeps,
  OpenForReadingError,
} from './domains/library/use-cases/open-for-reading';
import { readCover } from './domains/library/use-cases/read-cover';
import type { ReadCoverDeps } from './domains/library/use-cases/read-cover';
import { readLibrarySize } from './domains/library/use-cases/read-library-size';
import type { ReadLibrarySizeDeps } from './domains/library/use-cases/read-library-size';
import { removeBook } from './domains/library/use-cases/remove-book';
import type { RemoveBookDeps } from './domains/library/use-cases/remove-book';
import { createCanvasCropper } from './domains/recognition/adapters/engine/canvas-cropper';
import { createModelStorage } from './domains/recognition/adapters/model/cache-api-model-storage';
import { createCaptureRepository } from './domains/recognition/adapters/capture/indexeddb-captures.repo';
import { createModelConsentStore } from './domains/recognition/adapters/model/indexeddb-model-consent';
import { createRecognizerSetupStore } from './domains/recognition/adapters/engine/indexeddb-recognizer-setup';
import { createPartialDownloads } from './domains/recognition/adapters/model/opfs-partial-downloads';
import type { Capture, CaptureDraft } from './domains/recognition/domain/capture/capture';
import type { CaptureError } from './domains/recognition/domain/capture/capture-repository';
import type { GpuDetection } from './domains/recognition/domain/engine/compute-choice';
import type { ModelRuntime } from './domains/recognition/domain/engine/model-runtime';
import { chosenModel } from './domains/recognition/domain/model/model-footprint';
import type { ModelStorageReport } from './domains/recognition/domain/model/model-cache';
import type {
  ModelConsentDecision,
  ModelConsentError,
} from './domains/recognition/domain/model/model-consent';
import type { ModelLoad, ModelLoadError } from './domains/recognition/domain/model/model-load';
import type { PartialReport } from './domains/recognition/domain/model/model-partial';
import type { ModelStorageError } from './domains/recognition/domain/model/model-storage';
import type { PartialError } from './domains/recognition/domain/model/partial-downloads';
import type { RecognizedText } from './domains/recognition/domain/engine/recognized-text';
import type { RecognizerSession } from './domains/recognition/domain/engine/recognizer-session';
import type {
  RecognizerChoice,
  RecognizerSetup,
  SetupError,
} from './domains/recognition/domain/engine/recognizer-setup';
import type { TextRecognizer } from './domains/recognition/domain/engine/text-recognizer';
import { cancelModelLoad } from './domains/recognition/use-cases/model/cancel-model-load';
import { closeRecognizer } from './domains/recognition/use-cases/engine/close-recognizer';
import { clearCaptures } from './domains/recognition/use-cases/capture/clear-captures';
import type { ClearCapturesDeps } from './domains/recognition/use-cases/capture/clear-captures';
import { deleteModel } from './domains/recognition/use-cases/model/delete-model';
import type { DeleteModelDeps } from './domains/recognition/use-cases/model/delete-model';
import { detectCompute } from './domains/recognition/use-cases/engine/detect-compute';
import type { DetectComputeDeps } from './domains/recognition/use-cases/engine/detect-compute';
import { editCaptureText } from './domains/recognition/use-cases/capture/edit-capture-text';
import type { EditCaptureTextDeps } from './domains/recognition/use-cases/capture/edit-capture-text';
import { grantModelConsent } from './domains/recognition/use-cases/model/grant-model-consent';
import type { GrantModelConsentDeps } from './domains/recognition/use-cases/model/grant-model-consent';
import { listCaptures } from './domains/recognition/use-cases/capture/list-captures';
import type { ListCapturesDeps } from './domains/recognition/use-cases/capture/list-captures';
import { listEveryCapture } from './domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureDeps } from './domains/recognition/use-cases/capture/list-every-capture';
import { pauseModelLoad } from './domains/recognition/use-cases/model/pause-model-load';
import { prepareRecognizer } from './domains/recognition/use-cases/engine/prepare-recognizer';
import { readModelConsent } from './domains/recognition/use-cases/model/read-model-consent';
import type { ReadModelConsentDeps } from './domains/recognition/use-cases/model/read-model-consent';
import { readModelStorage } from './domains/recognition/use-cases/model/read-model-storage';
import type {
  ModelStorageSnapshot,
  ReadModelStorageDeps,
} from './domains/recognition/use-cases/model/read-model-storage';
import { readRecognizerSetup } from './domains/recognition/use-cases/engine/read-recognizer-setup';
import type { ReadRecognizerSetupDeps } from './domains/recognition/use-cases/engine/read-recognizer-setup';
import { recognizeRegion } from './domains/recognition/use-cases/engine/recognize-region';
import type { RecognizeRegionError } from './domains/recognition/use-cases/engine/recognize-region';
import { removeCapture } from './domains/recognition/use-cases/capture/remove-capture';
import type { RemoveCaptureDeps } from './domains/recognition/use-cases/capture/remove-capture';
import { saveCapture } from './domains/recognition/use-cases/capture/save-capture';
import type { SaveCaptureDeps } from './domains/recognition/use-cases/capture/save-capture';
import { saveRecognizerSetup } from './domains/recognition/use-cases/engine/save-recognizer-setup';
import type { SaveRecognizerSetupDeps } from './domains/recognition/use-cases/engine/save-recognizer-setup';
import { createOriginStores } from './domains/storage/adapters/browser-origin-stores';
import type { OriginStoresError } from './domains/storage/domain/origin-stores';
import type { StorageAccount } from './domains/storage/domain/storage-parts';
import { readStorageAccount } from './domains/storage/use-cases/read-storage-account';
import type { ReadStorageAccountDeps } from './domains/storage/use-cases/read-storage-account';

type RecognitionProgress = (load: ModelLoad) => void;

type RecognitionSessionReport = (session: RecognizerSession) => void;

type RecognitionNotices = {
  readonly onProgress?: RecognitionProgress;
  readonly onSession?: RecognitionSessionReport;
};

const progressListeners = new Map<Language, Set<RecognitionProgress>>();

const sessionListeners = new Map<Language, Set<RecognitionSessionReport>>();

const openedSessions = new Map<Language, RecognizerSession>();

function progressFor(language: Language): Set<RecognitionProgress> {
  const held = progressListeners.get(language);
  if (held !== undefined) return held;

  const opened = new Set<RecognitionProgress>();
  progressListeners.set(language, opened);
  return opened;
}

function sessionsFor(language: Language): Set<RecognitionSessionReport> {
  const held = sessionListeners.get(language);
  if (held !== undefined) return held;

  const opened = new Set<RecognitionSessionReport>();
  sessionListeners.set(language, opened);
  return opened;
}

function noteSession(language: Language, session: RecognizerSession): void {
  openedSessions.set(language, session);
  for (const report of sessionsFor(language)) report(session);
}

const setups = createRecognizerSetupStore();

const readRecognizerSetupDeps: ReadRecognizerSetupDeps = { setups };

async function setupFor(language: Language): Promise<RecognizerSetup | null> {
  const choice = await readRecognizerSetup(readRecognizerSetupDeps, language);
  if (!choice.ok || choice.value.model === null) return null;
  return { modelId: choice.value.model.modelId, compute: choice.value.compute };
}

function noticesFor(language: Language): {
  readonly readSetup: () => Promise<RecognizerSetup | null>;
  readonly onProgress: (load: ModelLoad) => void;
  readonly onSession: (session: RecognizerSession) => void;
  readonly beginTrace: TraceFactory;
} {
  return {
    readSetup: () => setupFor(language),
    beginTrace,
    onProgress: (load) => {
      for (const report of progressFor(language)) report(load);
    },
    onSession: (session) => {
      noteSession(language, session);
    },
  };
}

async function loadMangaOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createMangaOcrRecognizer } =
    await import('./domains/recognition/adapters/engine/manga-ocr.adapter');
  return createMangaOcrRecognizer(noticesFor(language));
}

async function loadPaddleOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createPaddleOcrRecognizer } =
    await import('./domains/recognition/adapters/engine/paddle-ocr.adapter');
  return createPaddleOcrRecognizer(noticesFor(language));
}

const recognizers = new Map<Language, Promise<TextRecognizer>>();

async function runtimeFor(language: Language): Promise<ModelRuntime> {
  const setup = await setupFor(language);
  const model = chosenModel(language, setup?.modelId ?? null);
  if (model === null) throw new Error(`No recognition model is known for ${language}.`);
  return model.runtime;
}

function recognizerFor(language: Language): Promise<TextRecognizer> {
  const held = recognizers.get(language);
  if (held !== undefined) return held;

  const loading = runtimeFor(language)
    .then((runtime) =>
      match(runtime)
        .with('manga-ocr', () => loadMangaOcrRecognizer(language))
        .with('paddle-ocr', () => loadPaddleOcrRecognizer(language))
        .exhaustive(),
    )
    .catch((cause: unknown): never => {
      recognizers.delete(language);
      throw cause;
    });

  recognizers.set(language, loading);
  return loading;
}

type Container = {
  readonly beginTrace: TraceFactory;
  readonly library: {
    readonly openFile: (
      files: readonly File[],
      report?: UploadReport,
    ) => Promise<Result<Book, OpenFileError>>;
    readonly openForReading: (id: BookId) => Promise<Result<OpenedBook, OpenForReadingError>>;
    readonly listBooks: () => Promise<Result<readonly Book[], LibraryError>>;
    readonly readCover: (id: BookId) => Promise<Result<Blob, LibraryError>>;
    readonly removeBook: (id: BookId) => Promise<Result<void, LibraryError>>;
    readonly editBook: (id: BookId, edit: BookEdit) => Promise<Result<Book, LibraryError>>;
    readonly readLibrarySize: () => Promise<Result<number, LibraryError>>;
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
      notices?: RecognitionNotices,
    ) => Promise<Result<RecognizedText, RecognizeRegionError>>;
    readonly listCaptures: (book: BookId) => Promise<Result<readonly Capture[], CaptureError>>;
    readonly listEveryCapture: () => Promise<Result<readonly Capture[], CaptureError>>;
    readonly saveCapture: (draft: CaptureDraft) => Promise<Result<Capture, CaptureError>>;
    readonly editCaptureText: (
      capture: Capture,
      text: string,
    ) => Promise<Result<Capture, CaptureError>>;
    readonly removeCapture: (capture: CaptureId) => Promise<Result<void, CaptureError>>;
    readonly clearCaptures: (book: BookId) => Promise<Result<void, CaptureError>>;
    readonly readModelStorage: (
      modelId: string,
    ) => Promise<Result<ModelStorageSnapshot, ModelStorageError>>;
    readonly deleteModel: (
      language: Language,
      modelId: string,
    ) => Promise<Result<ModelStorageReport, ModelStorageError>>;
    readonly readRecognizerSetup: (
      language: Language,
    ) => Promise<Result<RecognizerChoice, SetupError>>;
    readonly saveRecognizerSetup: (
      language: Language,
      setup: RecognizerSetup,
    ) => Promise<Result<void, SetupError>>;
    readonly detectCompute: () => Promise<GpuDetection>;
    readonly prepareRecognizer: (
      language: Language,
      notices?: RecognitionNotices,
    ) => Promise<Result<RecognizerSession, ModelLoadError>>;
    readonly pauseModelLoad: (language: Language) => Promise<void>;
    readonly cancelModelLoad: (
      language: Language,
      modelId: string,
    ) => Promise<Result<PartialReport, PartialError> | null>;
    readonly closeRecognizer: (language: Language) => Promise<void>;
  };
  readonly storage: {
    readonly readStorageAccount: () => Promise<Result<StorageAccount, OriginStoresError>>;
  };
};

function buildContainer(): Container {
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
  const readLibrarySizeDeps: ReadLibrarySizeDeps = { repository };
  const cropper = createCanvasCropper(beginTrace);
  const consent = createModelConsentStore();
  const readModelConsentDeps: ReadModelConsentDeps = { consent, setups };
  const grantModelConsentDeps: GrantModelConsentDeps = { consent, setups, requestPersistence };
  const captures = createCaptureRepository();
  const listCapturesDeps: ListCapturesDeps = { captures };
  const listEveryCaptureDeps: ListEveryCaptureDeps = { captures };
  const saveCaptureDeps: SaveCaptureDeps = { captures, now: Date.now };
  const editCaptureTextDeps: EditCaptureTextDeps = { captures, now: Date.now };
  const removeCaptureDeps: RemoveCaptureDeps = { captures };
  const clearCapturesDeps: ClearCapturesDeps = { captures };
  const storage = createModelStorage();
  const partials = createPartialDownloads();
  const readModelStorageDeps: ReadModelStorageDeps = {
    storage,
    partials,
    estimate: storageEstimate,
    persisted: isPersisted,
  };
  const deleteModelDeps: DeleteModelDeps = { storage, partials, consent };
  const saveRecognizerSetupDeps: SaveRecognizerSetupDeps = { setups };
  const readStorageAccountDeps: ReadStorageAccountDeps = {
    stores: createOriginStores(),
    estimate: storageEstimate,
    persisted: isPersisted,
  };
  const detectComputeDeps: DetectComputeDeps = { probe: probeGpu };

  return {
    beginTrace,
    library: {
      openFile: (files: readonly File[], report?: UploadReport) =>
        openFile(openFileDeps, files, report),
      openForReading: (id: BookId) => openForReading(openForReadingDeps, id),
      listBooks: () => listBooks(listBooksDeps),
      readCover: (id: BookId) => readCover(readCoverDeps, id),
      removeBook: (id: BookId) => removeBook(removeBookDeps, id),
      editBook: (id: BookId, edit: BookEdit) => editBook(editBookDeps, id, edit),
      readLibrarySize: () => readLibrarySize(readLibrarySizeDeps),
    },
    recognition: {
      readModelConsent: (language: Language) => readModelConsent(readModelConsentDeps, language),
      grantModelConsent: (language: Language) => grantModelConsent(grantModelConsentDeps, language),
      recognizeRegion: async (
        language: Language,
        source: PageSource,
        regions: readonly ImageRegion[],
        arrangement: Arrangement,
        notices: RecognitionNotices = {},
      ) => {
        const { onProgress, onSession } = notices;
        const listening = progressFor(language);
        const watching = sessionsFor(language);
        if (onProgress !== undefined) listening.add(onProgress);
        if (onSession !== undefined) {
          watching.add(onSession);
          const opened = openedSessions.get(language);
          if (opened !== undefined) onSession(opened);
        }

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
          if (onSession !== undefined) watching.delete(onSession);
        }
      },
      listCaptures: (book: BookId) => listCaptures(listCapturesDeps, book),
      listEveryCapture: () => listEveryCapture(listEveryCaptureDeps),
      saveCapture: (draft: CaptureDraft) => saveCapture(saveCaptureDeps, draft),
      editCaptureText: (capture: Capture, text: string) =>
        editCaptureText(editCaptureTextDeps, capture, text),
      removeCapture: (capture: CaptureId) => removeCapture(removeCaptureDeps, capture),
      clearCaptures: (book: BookId) => clearCaptures(clearCapturesDeps, book),
      readModelStorage: (modelId: string) => readModelStorage(readModelStorageDeps, modelId),
      deleteModel: (language: Language, modelId: string) =>
        deleteModel(deleteModelDeps, language, modelId),
      readRecognizerSetup: (language: Language) =>
        readRecognizerSetup(readRecognizerSetupDeps, language),
      saveRecognizerSetup: (language: Language, setup: RecognizerSetup) =>
        saveRecognizerSetup(saveRecognizerSetupDeps, language, setup),
      detectCompute: () => detectCompute(detectComputeDeps),
      prepareRecognizer: async (language: Language, notices: RecognitionNotices = {}) => {
        const { onProgress, onSession } = notices;
        const listening = progressFor(language);
        const watching = sessionsFor(language);
        if (onProgress !== undefined) listening.add(onProgress);
        if (onSession !== undefined) watching.add(onSession);

        try {
          const recognizer = await recognizerFor(language);
          const opened = await prepareRecognizer({ recognizer });
          return opened;
        } finally {
          if (onProgress !== undefined) listening.delete(onProgress);
          if (onSession !== undefined) watching.delete(onSession);
        }
      },
      pauseModelLoad: async (language: Language) => {
        openedSessions.delete(language);
        const recognizer = await recognizerFor(language).catch(() => null);
        if (recognizer === null) return;
        pauseModelLoad({ recognizer });
      },
      cancelModelLoad: async (language: Language, modelId: string) => {
        openedSessions.delete(language);
        const recognizer = await recognizerFor(language).catch(() => null);
        if (recognizer === null) return null;
        return await cancelModelLoad({ recognizer, partials }, modelId);
      },
      closeRecognizer: async (language: Language) => {
        openedSessions.delete(language);
        const held = recognizers.get(language);
        recognizers.delete(language);
        if (held === undefined) return;

        const recognizer = await held.catch(() => null);
        if (recognizer === null) return;
        closeRecognizer({ recognizer });
      },
    },
    storage: {
      readStorageAccount: () => readStorageAccount(readStorageAccountDeps),
    },
  };
}

export { recognizerFor, buildContainer };
export type { RecognitionProgress, RecognitionSessionReport, RecognitionNotices, Container };
