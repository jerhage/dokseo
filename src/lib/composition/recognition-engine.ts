import { probeGpu } from '$lib/platform/gpu/adapter-probe';
import {
  isPersisted,
  requestPersistence,
  storageEstimate,
} from '$lib/platform/storage/persistence';
import { beginTrace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { createCanvasCropper } from '../domains/recognition/adapters/engine/canvas-cropper';
import { createModelStorage } from '../domains/recognition/adapters/model/cache-api-model-storage';
import { createModelConsentStore } from '../domains/recognition/adapters/model/indexeddb-model-consent';
import { createPartialDownloads } from '../domains/recognition/adapters/model/opfs-partial-downloads';
import type { GpuDetection } from '../domains/recognition/domain/engine/compute-choice';
import type { RecognizerSetup } from '../domains/recognition/domain/engine/recognizer-setup';
import { closeRecognizer } from '../domains/recognition/use-cases/engine/close-recognizer';
import { detectCompute } from '../domains/recognition/use-cases/engine/detect-compute';
import { prepareRecognizer } from '../domains/recognition/use-cases/engine/prepare-recognizer';
import type { PrepareRecognizerResult } from '../domains/recognition/use-cases/engine/prepare-recognizer';
import { readRecognizerSetup } from '../domains/recognition/use-cases/engine/read-recognizer-setup';
import type { ReadRecognizerSetupResult } from '../domains/recognition/use-cases/engine/read-recognizer-setup';
import { recognizeRegion } from '../domains/recognition/use-cases/engine/recognize-region';
import type { RecognizeRegionResult } from '../domains/recognition/use-cases/engine/recognize-region';
import { saveRecognizerSetup } from '../domains/recognition/use-cases/engine/save-recognizer-setup';
import type { SaveRecognizerSetupResult } from '../domains/recognition/use-cases/engine/save-recognizer-setup';
import { cancelModelLoad } from '../domains/recognition/use-cases/model/cancel-model-load';
import type { CancelModelLoadResult } from '../domains/recognition/use-cases/model/cancel-model-load';
import { deleteModel } from '../domains/recognition/use-cases/model/delete-model';
import type { DeleteModelResult } from '../domains/recognition/use-cases/model/delete-model';
import { grantModelConsent } from '../domains/recognition/use-cases/model/grant-model-consent';
import type { GrantModelConsentResult } from '../domains/recognition/use-cases/model/grant-model-consent';
import { pauseModelLoad } from '../domains/recognition/use-cases/model/pause-model-load';
import { readModelConsent } from '../domains/recognition/use-cases/model/read-model-consent';
import type { ReadModelConsentResult } from '../domains/recognition/use-cases/model/read-model-consent';
import { readModelStorage } from '../domains/recognition/use-cases/model/read-model-storage';
import type { ReadModelStorageResult } from '../domains/recognition/use-cases/model/read-model-storage';
import { progressNotices, recognizerFor, recognizers, sessionNotices, setups } from './recognizers';
import type { RecognitionNotices } from './recognizers';

type RecognitionEngineUseCases = {
  readonly readModelConsent: (language: Language) => Promise<ReadModelConsentResult>;
  readonly grantModelConsent: (language: Language) => Promise<GrantModelConsentResult>;
  readonly recognizeRegion: (
    language: Language,
    source: PageSource,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
    notices?: RecognitionNotices,
  ) => Promise<RecognizeRegionResult>;
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

function buildRecognitionEngine(): RecognitionEngineUseCases {
  const cropper = createCanvasCropper(beginTrace);
  const consent = createModelConsentStore();
  const storage = createModelStorage();
  const partials = createPartialDownloads();

  return {
    readModelConsent: (language: Language) => readModelConsent({ consent, setups }, language),
    grantModelConsent: (language: Language) =>
      grantModelConsent({ consent, setups, requestPersistence }, language),
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
    readModelStorage: (modelId: string) =>
      readModelStorage(
        { storage, partials, estimate: storageEstimate, persisted: isPersisted },
        modelId,
      ),
    deleteModel: (language: Language, modelId: string) =>
      deleteModel({ storage, partials, consent }, language, modelId),
    readRecognizerSetup: (language: Language) => readRecognizerSetup({ setups }, language),
    saveRecognizerSetup: (language: Language, setup: RecognizerSetup) =>
      saveRecognizerSetup({ setups }, language, setup),
    detectCompute: () => detectCompute({ probe: probeGpu }),
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
  };
}

export { buildRecognitionEngine };
export type { RecognitionEngineUseCases };
