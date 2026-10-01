import { match } from 'ts-pattern';
import { fingerprintOf } from '$lib/platform/crypto/fingerprint';
import { partialMd5 } from '$lib/platform/crypto/partial-md5';
import { noticeBoard } from '$lib/platform/events/notice-board';
import { probeGpu } from '$lib/platform/gpu/adapter-probe';
import {
  isPersisted,
  requestPersistence,
  storageEstimate,
} from '$lib/platform/storage/persistence';
import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Anchor } from '$lib/shared/anchor';
import type { Arrangement } from '$lib/shared/arrangement';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { createReadingSettingsStore } from './domains/flowing/adapters/indexeddb-reading-settings';
import type { ReadingSettings } from './domains/flowing/domain/reading-settings';
import { readReadingSettings } from './domains/flowing/use-cases/read-reading-settings';
import type {
  ReadReadingSettingsDeps,
  ReadReadingSettingsResult,
} from './domains/flowing/use-cases/read-reading-settings';
import { saveReadingSettings } from './domains/flowing/use-cases/save-reading-settings';
import type {
  SaveReadingSettingsDeps,
  SaveReadingSettingsResult,
} from './domains/flowing/use-cases/save-reading-settings';
import { createFileSourceBuilder } from './domains/library/adapters/file-source-builder';
import { createLibraryRepository } from './domains/library/adapters/indexeddb-opfs-library.repo';
import {
  listStoredPageNames,
  openListedPageSource,
  openStoredPageSource,
} from './domains/library/adapters/stored-page-source';
import type { BookEdit } from './domains/library/domain/book/book';
import type { BookMatching } from './domains/library/domain/book/book-matching';
import type { UploadReport } from './domains/library/domain/ingest/upload-progress';
import { editBook } from './domains/library/use-cases/edit-book';
import type { EditBookDeps, EditBookResult } from './domains/library/use-cases/edit-book';
import { listBooks } from './domains/library/use-cases/list-books';
import type { ListBooksDeps, ListBooksResult } from './domains/library/use-cases/list-books';
import { markFinished } from './domains/library/use-cases/mark-finished';
import type {
  MarkFinishedDeps,
  MarkFinishedResult,
} from './domains/library/use-cases/mark-finished';
import { markUnread } from './domains/library/use-cases/mark-unread';
import type { MarkUnreadDeps, MarkUnreadResult } from './domains/library/use-cases/mark-unread';
import { openFile } from './domains/library/use-cases/open-file';
import type { OpenFileDeps, OpenFileResult } from './domains/library/use-cases/open-file';
import { openForReading } from './domains/library/use-cases/open-for-reading';
import type {
  OpenForReadingDeps,
  OpenForReadingResult,
} from './domains/library/use-cases/open-for-reading';
import { readBook } from './domains/library/use-cases/read-book';
import type { ReadBookDeps, ReadBookResult } from './domains/library/use-cases/read-book';
import { readCover } from './domains/library/use-cases/read-cover';
import type { ReadCoverDeps, ReadCoverResult } from './domains/library/use-cases/read-cover';
import { readLibrarySize } from './domains/library/use-cases/read-library-size';
import type {
  ReadLibrarySizeDeps,
  ReadLibrarySizeResult,
} from './domains/library/use-cases/read-library-size';
import { readPageSizes } from './domains/library/use-cases/read-page-sizes';
import type { ReadPageSizesResult } from './domains/library/use-cases/read-page-sizes';
import { readSource } from './domains/library/use-cases/read-source';
import type { ReadSourceDeps, ReadSourceResult } from './domains/library/use-cases/read-source';
import { saveReadingPlace } from './domains/library/use-cases/save-reading-place';
import type {
  SaveReadingPlaceDeps,
  SaveReadingPlaceResult,
} from './domains/library/use-cases/save-reading-place';
import { createCanvasCropper } from './domains/recognition/adapters/engine/canvas-cropper';
import { createModelStorage } from './domains/recognition/adapters/model/cache-api-model-storage';
import { createCaptureRepository } from './domains/recognition/adapters/capture/indexeddb-captures.repo';
import { createModelConsentStore } from './domains/recognition/adapters/model/indexeddb-model-consent';
import { createRecognizerSetupStore } from './domains/recognition/adapters/engine/indexeddb-recognizer-setup';
import { createTagRepository } from './domains/recognition/adapters/tag/indexeddb-tags.repo';
import { createPartialDownloads } from './domains/recognition/adapters/model/opfs-partial-downloads';
import type {
  Capture,
  CaptureDraft,
  NotableCapture,
} from './domains/recognition/domain/capture/capture';
import type { GpuDetection } from './domains/recognition/domain/engine/compute-choice';
import type { ModelRuntime } from './domains/recognition/domain/engine/model-runtime';
import { chosenModel } from './domains/recognition/domain/model/model-footprint';
import type { ModelLoad } from './domains/recognition/domain/model/model-load';
import type { RecognizerSession } from './domains/recognition/domain/engine/recognizer-session';
import { setupChoice } from './domains/recognition/domain/engine/recognizer-setup';
import type { RecognizerSetup } from './domains/recognition/domain/engine/recognizer-setup';
import type { TextRecognizer } from './domains/recognition/domain/engine/text-recognizer';
import type { Tag } from './domains/recognition/domain/tag/tag';
import type { TagColour } from './domains/recognition/domain/tag/tag-colour';
import { addTagToCapture } from './domains/recognition/use-cases/tag/add-tag-to-capture';
import type {
  AddTagToCaptureDeps,
  AddTagToCaptureResult,
} from './domains/recognition/use-cases/tag/add-tag-to-capture';
import { cancelModelLoad } from './domains/recognition/use-cases/model/cancel-model-load';
import type { CancelModelLoadResult } from './domains/recognition/use-cases/model/cancel-model-load';
import { closeRecognizer } from './domains/recognition/use-cases/engine/close-recognizer';
import { clearCaptures } from './domains/recognition/use-cases/capture/clear-captures';
import type {
  ClearCapturesDeps,
  ClearCapturesResult,
} from './domains/recognition/use-cases/capture/clear-captures';
import { createTag } from './domains/recognition/use-cases/tag/create-tag';
import type {
  CreateTagDeps,
  CreateTagResult,
} from './domains/recognition/use-cases/tag/create-tag';
import { deleteTag } from './domains/recognition/use-cases/tag/delete-tag';
import type {
  DeleteTagDeps,
  DeleteTagResult,
} from './domains/recognition/use-cases/tag/delete-tag';
import { deleteModel } from './domains/recognition/use-cases/model/delete-model';
import type {
  DeleteModelDeps,
  DeleteModelResult,
} from './domains/recognition/use-cases/model/delete-model';
import { detectCompute } from './domains/recognition/use-cases/engine/detect-compute';
import type { DetectComputeDeps } from './domains/recognition/use-cases/engine/detect-compute';
import { editCaptureText } from './domains/recognition/use-cases/capture/edit-capture-text';
import type {
  EditCaptureTextDeps,
  EditCaptureTextResult,
} from './domains/recognition/use-cases/capture/edit-capture-text';
import { writeCaptureNote } from './domains/recognition/use-cases/capture/write-capture-note';
import type {
  WriteCaptureNoteDeps,
  WriteCaptureNoteResult,
} from './domains/recognition/use-cases/capture/write-capture-note';
import { grantModelConsent } from './domains/recognition/use-cases/model/grant-model-consent';
import type {
  GrantModelConsentDeps,
  GrantModelConsentResult,
} from './domains/recognition/use-cases/model/grant-model-consent';
import { listCaptures } from './domains/recognition/use-cases/capture/list-captures';
import type {
  ListCapturesDeps,
  ListCapturesResult,
} from './domains/recognition/use-cases/capture/list-captures';
import { listEveryCapture } from './domains/recognition/use-cases/capture/list-every-capture';
import type {
  ListEveryCaptureDeps,
  ListEveryCaptureResult,
} from './domains/recognition/use-cases/capture/list-every-capture';
import { listTags } from './domains/recognition/use-cases/tag/list-tags';
import type { ListTagsDeps, ListTagsResult } from './domains/recognition/use-cases/tag/list-tags';
import { pauseModelLoad } from './domains/recognition/use-cases/model/pause-model-load';
import { prepareRecognizer } from './domains/recognition/use-cases/engine/prepare-recognizer';
import type { PrepareRecognizerResult } from './domains/recognition/use-cases/engine/prepare-recognizer';
import { readModelConsent } from './domains/recognition/use-cases/model/read-model-consent';
import type {
  ReadModelConsentDeps,
  ReadModelConsentResult,
} from './domains/recognition/use-cases/model/read-model-consent';
import { readModelStorage } from './domains/recognition/use-cases/model/read-model-storage';
import type {
  ReadModelStorageDeps,
  ReadModelStorageResult,
} from './domains/recognition/use-cases/model/read-model-storage';
import { readRecognizerSetup } from './domains/recognition/use-cases/engine/read-recognizer-setup';
import type {
  ReadRecognizerSetupDeps,
  ReadRecognizerSetupResult,
} from './domains/recognition/use-cases/engine/read-recognizer-setup';
import { recognizeRegion } from './domains/recognition/use-cases/engine/recognize-region';
import type { RecognizeRegionResult } from './domains/recognition/use-cases/engine/recognize-region';
import { removeCapture } from './domains/recognition/use-cases/capture/remove-capture';
import type {
  RemoveCaptureDeps,
  RemoveCaptureResult,
} from './domains/recognition/use-cases/capture/remove-capture';
import { restoreCapture } from './domains/recognition/use-cases/capture/restore-capture';
import type {
  RestoreCaptureDeps,
  RestoreCaptureResult,
} from './domains/recognition/use-cases/capture/restore-capture';
import { recolourTag } from './domains/recognition/use-cases/tag/recolour-tag';
import type {
  RecolourTagDeps,
  RecolourTagResult,
} from './domains/recognition/use-cases/tag/recolour-tag';
import { removeTagFromCapture } from './domains/recognition/use-cases/tag/remove-tag-from-capture';
import type {
  RemoveTagFromCaptureDeps,
  RemoveTagFromCaptureResult,
} from './domains/recognition/use-cases/tag/remove-tag-from-capture';
import { renameTag } from './domains/recognition/use-cases/tag/rename-tag';
import type {
  RenameTagDeps,
  RenameTagResult,
} from './domains/recognition/use-cases/tag/rename-tag';
import { saveCapture } from './domains/recognition/use-cases/capture/save-capture';
import type {
  SaveCaptureDeps,
  SaveCaptureResult,
} from './domains/recognition/use-cases/capture/save-capture';
import { saveRecognizerSetup } from './domains/recognition/use-cases/engine/save-recognizer-setup';
import type {
  SaveRecognizerSetupDeps,
  SaveRecognizerSetupResult,
} from './domains/recognition/use-cases/engine/save-recognizer-setup';
import { writeNote } from './domains/recognition/use-cases/capture/write-note';
import type {
  WriteNoteDeps,
  WriteNoteResult,
} from './domains/recognition/use-cases/capture/write-note';
import { createOriginStores } from './domains/storage/adapters/browser-origin-stores';
import { readStorageAccount } from './domains/storage/use-cases/read-storage-account';
import type {
  ReadStorageAccountDeps,
  ReadStorageAccountResult,
} from './domains/storage/use-cases/read-storage-account';
import { removeBookAndCaptures } from './domains/storage/use-cases/remove-book-and-captures';
import type {
  RemoveBookAndCapturesDeps,
  RemoveBookAndCapturesResult,
} from './domains/storage/use-cases/remove-book-and-captures';

type RecognitionProgress = (load: ModelLoad) => void;

type RecognitionSessionReport = (session: RecognizerSession) => void;

type RecognitionNotices = {
  readonly onProgress?: RecognitionProgress;
  readonly onSession?: RecognitionSessionReport;
};

const progressNotices = noticeBoard<Language, ModelLoad>();

const sessionNotices = noticeBoard<Language, RecognizerSession>();

const setups = createRecognizerSetupStore();

const readRecognizerSetupDeps: ReadRecognizerSetupDeps = { setups };

async function setupFor(language: Language): Promise<RecognizerSetup | null> {
  const read = await readRecognizerSetup(readRecognizerSetupDeps, language);
  const choice = read.kind === 'success' ? read.choice : setupChoice(language, null);
  if (choice.model === null) return null;
  return { modelId: choice.model.modelId, compute: choice.compute };
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
      progressNotices.post(language, load);
    },
    onSession: (session) => {
      sessionNotices.post(language, session);
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
      matching: BookMatching,
      report?: UploadReport,
    ) => Promise<OpenFileResult>;
    readonly openForReading: (id: BookId) => Promise<OpenForReadingResult>;
    readonly listBooks: () => Promise<ListBooksResult>;
    readonly readBook: (id: BookId) => Promise<ReadBookResult>;
    readonly readCover: (id: BookId) => Promise<ReadCoverResult>;
    readonly readSource: (id: BookId) => Promise<ReadSourceResult>;
    readonly removeBook: (id: BookId) => Promise<RemoveBookAndCapturesResult>;
    readonly editBook: (id: BookId, edit: BookEdit) => Promise<EditBookResult>;
    readonly saveReadingPlace: (id: BookId, place: ReadingPlace) => Promise<SaveReadingPlaceResult>;
    readonly markFinished: (id: BookId) => Promise<MarkFinishedResult>;
    readonly markUnread: (id: BookId) => Promise<MarkUnreadResult>;
    readonly readLibrarySize: () => Promise<ReadLibrarySizeResult>;
    readonly readPageSizes: (source: PageSource) => Promise<ReadPageSizesResult>;
  };
  readonly flowing: {
    readonly readReadingSettings: () => Promise<ReadReadingSettingsResult>;
    readonly saveReadingSettings: (settings: ReadingSettings) => Promise<SaveReadingSettingsResult>;
  };
  readonly recognition: {
    readonly readModelConsent: (language: Language) => Promise<ReadModelConsentResult>;
    readonly grantModelConsent: (language: Language) => Promise<GrantModelConsentResult>;
    readonly recognizeRegion: (
      language: Language,
      source: PageSource,
      regions: readonly ImageRegion[],
      arrangement: Arrangement,
      notices?: RecognitionNotices,
    ) => Promise<RecognizeRegionResult>;
    readonly listCaptures: (book: BookId) => Promise<ListCapturesResult>;
    readonly listEveryCapture: () => Promise<ListEveryCaptureResult>;
    readonly saveCapture: (draft: CaptureDraft) => Promise<SaveCaptureResult>;
    readonly writeNote: (id: CaptureId, book: BookId, anchor: Anchor) => Promise<WriteNoteResult>;
    readonly editCaptureText: (capture: Capture, text: string) => Promise<EditCaptureTextResult>;
    readonly writeCaptureNote: <T extends NotableCapture>(
      capture: T,
      note: string,
    ) => Promise<WriteCaptureNoteResult<T>>;
    readonly removeCapture: (capture: CaptureId) => Promise<RemoveCaptureResult>;
    readonly restoreCapture: (capture: Capture) => Promise<RestoreCaptureResult>;
    readonly clearCaptures: (book: BookId) => Promise<ClearCapturesResult>;
    readonly listTags: () => Promise<ListTagsResult>;
    readonly createTag: (id: TagId, name: string) => Promise<CreateTagResult>;
    readonly addTagToCapture: (capture: Capture, tag: TagId) => Promise<AddTagToCaptureResult>;
    readonly removeTagFromCapture: (
      capture: Capture,
      tag: TagId,
    ) => Promise<RemoveTagFromCaptureResult>;
    readonly renameTag: (tag: Tag, name: string) => Promise<RenameTagResult>;
    readonly recolourTag: (tag: Tag, colour: TagColour) => Promise<RecolourTagResult>;
    readonly deleteTag: (tag: TagId) => Promise<DeleteTagResult>;
    readonly readModelStorage: (modelId: string) => Promise<ReadModelStorageResult>;
    readonly deleteModel: (language: Language, modelId: string) => Promise<DeleteModelResult>;
    readonly readRecognizerSetup: (language: Language) => Promise<ReadRecognizerSetupResult>;
    readonly saveRecognizerSetup: (
      language: Language,
      setup: RecognizerSetup,
    ) => Promise<SaveRecognizerSetupResult>;
    readonly detectCompute: () => Promise<GpuDetection>;
    readonly prepareRecognizer: (
      language: Language,
      notices?: RecognitionNotices,
    ) => Promise<PrepareRecognizerResult>;
    readonly pauseModelLoad: (language: Language) => Promise<void>;
    readonly cancelModelLoad: (
      language: Language,
      modelId: string,
    ) => Promise<CancelModelLoadResult | null>;
    readonly closeRecognizer: (language: Language) => Promise<void>;
  };
  readonly storage: {
    readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
  };
};

function buildContainer(): Container {
  const repository = createLibraryRepository();

  const openFileDeps: OpenFileDeps = {
    repository,
    builder: createFileSourceBuilder(),
    inspectEpub: async (source: Blob) => {
      const { inspectEpubArchive } = await import('./domains/library/adapters/zip-epub-inspector');
      return await inspectEpubArchive(source);
    },
    partialMd5,
    legacyFingerprint: fingerprintOf,
    requestPersistence,
    now: Date.now,
    newId: () => crypto.randomUUID(),
  };

  const openForReadingDeps: OpenForReadingDeps = {
    repository,
    openPages: openStoredPageSource,
    openListedPages: openListedPageSource,
    listPageNames: listStoredPageNames,
  };
  const listBooksDeps: ListBooksDeps = { repository };
  const readBookDeps: ReadBookDeps = { repository };
  const readCoverDeps: ReadCoverDeps = { repository };
  const readSourceDeps: ReadSourceDeps = { repository };
  const editBookDeps: EditBookDeps = { repository };
  const saveReadingPlaceDeps: SaveReadingPlaceDeps = { repository, now: Date.now };
  const markFinishedDeps: MarkFinishedDeps = { repository, now: Date.now };
  const markUnreadDeps: MarkUnreadDeps = { repository };
  const readLibrarySizeDeps: ReadLibrarySizeDeps = { repository };
  const readingSettings = createReadingSettingsStore();
  const readReadingSettingsDeps: ReadReadingSettingsDeps = { settings: readingSettings };
  const saveReadingSettingsDeps: SaveReadingSettingsDeps = { settings: readingSettings };
  const cropper = createCanvasCropper(beginTrace);
  const consent = createModelConsentStore();
  const readModelConsentDeps: ReadModelConsentDeps = { consent, setups };
  const grantModelConsentDeps: GrantModelConsentDeps = { consent, setups, requestPersistence };
  const captures = createCaptureRepository();
  const listCapturesDeps: ListCapturesDeps = { captures };
  const listEveryCaptureDeps: ListEveryCaptureDeps = { captures };
  const saveCaptureDeps: SaveCaptureDeps = { captures, now: Date.now };
  const writeNoteDeps: WriteNoteDeps = { captures, now: Date.now };
  const editCaptureTextDeps: EditCaptureTextDeps = { captures, now: Date.now };
  const writeCaptureNoteDeps: WriteCaptureNoteDeps = { captures };
  const removeCaptureDeps: RemoveCaptureDeps = { captures };
  const restoreCaptureDeps: RestoreCaptureDeps = { captures };
  const clearCapturesDeps: ClearCapturesDeps = { captures };
  const removeBookAndCapturesDeps: RemoveBookAndCapturesDeps = {
    clearing: clearCapturesDeps,
    removal: { repository },
  };
  const tags = createTagRepository();
  const listTagsDeps: ListTagsDeps = { tags };
  const createTagDeps: CreateTagDeps = { tags, now: Date.now };
  const addTagToCaptureDeps: AddTagToCaptureDeps = { captures };
  const removeTagFromCaptureDeps: RemoveTagFromCaptureDeps = { captures };
  const renameTagDeps: RenameTagDeps = { tags };
  const recolourTagDeps: RecolourTagDeps = { tags };
  const deleteTagDeps: DeleteTagDeps = { tags, captures };
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
      openFile: (files: readonly File[], matching: BookMatching, report?: UploadReport) =>
        openFile(openFileDeps, files, report, matching),
      openForReading: (id: BookId) => openForReading(openForReadingDeps, id),
      listBooks: () => listBooks(listBooksDeps),
      readBook: (id: BookId) => readBook(readBookDeps, id),
      readCover: (id: BookId) => readCover(readCoverDeps, id),
      readSource: (id: BookId) => readSource(readSourceDeps, id),
      removeBook: (id: BookId) => removeBookAndCaptures(removeBookAndCapturesDeps, id),
      editBook: (id: BookId, edit: BookEdit) => editBook(editBookDeps, id, edit),
      saveReadingPlace: (id: BookId, place: ReadingPlace) =>
        saveReadingPlace(saveReadingPlaceDeps, id, place),
      markFinished: (id: BookId) => markFinished(markFinishedDeps, id),
      markUnread: (id: BookId) => markUnread(markUnreadDeps, id),
      readLibrarySize: () => readLibrarySize(readLibrarySizeDeps),
      readPageSizes: (source: PageSource) => readPageSizes(source),
    },
    flowing: {
      readReadingSettings: () => readReadingSettings(readReadingSettingsDeps),
      saveReadingSettings: (settings: ReadingSettings) =>
        saveReadingSettings(saveReadingSettingsDeps, settings),
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
        if (onProgress !== undefined) progressNotices.watch(language, onProgress);
        if (onSession !== undefined) {
          sessionNotices.watch(language, onSession);
          const opened = sessionNotices.latest(language);
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
          if (onProgress !== undefined) progressNotices.stop(language, onProgress);
          if (onSession !== undefined) sessionNotices.stop(language, onSession);
        }
      },
      listCaptures: (book: BookId) => listCaptures(listCapturesDeps, book),
      listEveryCapture: () => listEveryCapture(listEveryCaptureDeps),
      saveCapture: (draft: CaptureDraft) => saveCapture(saveCaptureDeps, draft),
      writeNote: (id: CaptureId, book: BookId, anchor: Anchor) =>
        writeNote(writeNoteDeps, id, book, anchor),
      editCaptureText: (capture: Capture, text: string) =>
        editCaptureText(editCaptureTextDeps, capture, text),
      writeCaptureNote: <T extends NotableCapture>(capture: T, note: string) =>
        writeCaptureNote(writeCaptureNoteDeps, capture, note),
      removeCapture: (capture: CaptureId) => removeCapture(removeCaptureDeps, capture),
      restoreCapture: (capture: Capture) => restoreCapture(restoreCaptureDeps, capture),
      clearCaptures: (book: BookId) => clearCaptures(clearCapturesDeps, book),
      listTags: () => listTags(listTagsDeps),
      createTag: (id: TagId, name: string) => createTag(createTagDeps, id, name),
      addTagToCapture: (capture: Capture, tag: TagId) =>
        addTagToCapture(addTagToCaptureDeps, capture, tag),
      removeTagFromCapture: (capture: Capture, tag: TagId) =>
        removeTagFromCapture(removeTagFromCaptureDeps, capture, tag),
      renameTag: (tag: Tag, name: string) => renameTag(renameTagDeps, tag, name),
      recolourTag: (tag: Tag, colour: TagColour) => recolourTag(recolourTagDeps, tag, colour),
      deleteTag: (tag: TagId) => deleteTag(deleteTagDeps, tag),
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
        if (onProgress !== undefined) progressNotices.watch(language, onProgress);
        if (onSession !== undefined) sessionNotices.watch(language, onSession);

        try {
          const recognizer = await recognizerFor(language);
          const opened = await prepareRecognizer({ recognizer });
          return opened;
        } finally {
          if (onProgress !== undefined) progressNotices.stop(language, onProgress);
          if (onSession !== undefined) sessionNotices.stop(language, onSession);
        }
      },
      pauseModelLoad: async (language: Language) => {
        sessionNotices.forget(language);
        const recognizer = await recognizerFor(language).catch(() => null);
        if (recognizer === null) return;
        pauseModelLoad({ recognizer });
      },
      cancelModelLoad: async (language: Language, modelId: string) => {
        sessionNotices.forget(language);
        const recognizer = await recognizerFor(language).catch(() => null);
        if (recognizer === null) return null;
        return await cancelModelLoad({ recognizer, partials }, modelId);
      },
      closeRecognizer: async (language: Language) => {
        sessionNotices.forget(language);
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
