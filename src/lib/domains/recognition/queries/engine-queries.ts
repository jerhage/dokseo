import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { QueryFailure, unwrap } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice, GpuDetection } from '../domain/engine/compute-choice';
import type { RecognizerSession } from '../domain/engine/recognizer-session';
import type {
  RecognizerChoice,
  RecognizerSetup,
  SetupError,
} from '../domain/engine/recognizer-setup';
import type { ModelStorageReport } from '../domain/model/model-cache';
import type { ModelConsentDecision, ModelConsentError } from '../domain/model/model-consent';
import { modelsFor } from '../domain/model/model-footprint';
import type { ModelFootprint } from '../domain/model/model-footprint';
import type { ModelLoad, ModelLoadError } from '../domain/model/model-load';
import type { PartialReport } from '../domain/model/model-partial';
import type { ModelStorageError } from '../domain/model/model-storage';
import type { PartialError } from '../domain/model/partial-downloads';
import type { ModelStorageSnapshot } from '../use-cases/model/read-model-storage';
import { recognitionKeys } from './recognition-keys';

type OfferedModels = readonly [ModelFootprint, ...ModelFootprint[]];

type LanguageSetup = {
  readonly language: Language;
  readonly models: OfferedModels;
  readonly selected: string | null;
  readonly compute: ComputeChoice;
};

type EngineReads = {
  readonly readRecognizerSetup: (
    language: Language,
  ) => Promise<Result<RecognizerChoice, SetupError>>;
  readonly detectCompute: () => Promise<GpuDetection>;
  readonly readModelConsent: (
    language: Language,
  ) => Promise<Result<ModelConsentDecision, ModelConsentError>>;
  readonly readModelStorage: (
    modelId: string,
  ) => Promise<Result<ModelStorageSnapshot, ModelStorageError>>;
};

type EngineWrites = {
  readonly saveRecognizerSetup: (
    language: Language,
    setup: RecognizerSetup,
  ) => Promise<Result<void, SetupError>>;
  readonly grantModelConsent: (language: Language) => Promise<Result<void, ModelConsentError>>;
  readonly prepareRecognizer: (
    language: Language,
    notices?: { readonly onProgress?: (load: ModelLoad) => void },
  ) => Promise<Result<RecognizerSession, ModelLoadError>>;
  readonly pauseModelLoad: (language: Language) => Promise<void>;
  readonly cancelModelLoad: (
    language: Language,
    modelId: string,
  ) => Promise<Result<PartialReport, PartialError> | null>;
  readonly closeRecognizer: (language: Language) => Promise<void>;
  readonly deleteModel: (
    language: Language,
    modelId: string,
  ) => Promise<Result<ModelStorageReport, ModelStorageError>>;
};

type SetupChange = {
  readonly setup: LanguageSetup;
  readonly modelId: string;
  readonly abandoned: string | null;
};

type ModelTarget = { readonly language: Language; readonly modelId: string };

type DownloadRequest = {
  readonly language: Language;
  readonly onProgress: (load: ModelLoad) => void;
};

const NO_MODEL = 'No recognition model reads this language.';

function offeredModels(language: Language): OfferedModels | null {
  const [first, ...rest] = modelsFor(language);
  return first === undefined ? null : [first, ...rest];
}

function setupReadNote(error: SetupError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so the engine choice cannot be read.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function consentReadNote(error: ModelConsentError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so the download consent cannot be read.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function storageFailureNote(error: ModelStorageError): string {
  return match(error)
    .with(
      { kind: 'cache-unavailable' },
      () => 'This browser exposes no cache, so what the model occupies cannot be read.',
    )
    .with({ kind: 'cache-failed' }, (failed) => `The cache could not be read: ${failed.cause}`)
    .exhaustive();
}

async function described<T>(
  read: () => Promise<T>,
  note: (cause: string) => string = (cause) => cause,
): Promise<T> {
  try {
    return await read();
  } catch (cause) {
    throw new QueryFailure(note(describeCause(cause)), { cause });
  }
}

function recognizerSetupQuery(
  recognition: Pick<EngineReads, 'readRecognizerSetup'>,
  language: Language | null,
) {
  return queryOptions({
    queryKey: recognitionKeys.setup(language),
    queryFn: async (): Promise<LanguageSetup> => {
      const models = language === null ? null : offeredModels(language);
      if (language === null || models === null) throw new QueryFailure(NO_MODEL);

      const read = await described(() => recognition.readRecognizerSetup(language));
      const choice = unwrap(read, setupReadNote);
      return { language, models, selected: choice.model?.modelId ?? null, compute: choice.compute };
    },
    staleTime: 0,
  });
}

function computeQuery(recognition: Pick<EngineReads, 'detectCompute'>) {
  return queryOptions({
    queryKey: recognitionKeys.compute(),
    queryFn: () => described(() => recognition.detectCompute()),
    staleTime: Infinity,
  });
}

function modelConsentQuery(recognition: Pick<EngineReads, 'readModelConsent'>, language: Language) {
  return queryOptions({
    queryKey: recognitionKeys.consent(language),
    queryFn: async () => {
      const read = await described(() => recognition.readModelConsent(language));
      return unwrap(read, consentReadNote);
    },
    staleTime: 0,
  });
}

function modelStorageQuery(recognition: Pick<EngineReads, 'readModelStorage'>, modelId: string) {
  return queryOptions({
    queryKey: recognitionKeys.modelStorage(modelId),
    queryFn: async () => {
      const read = await described(
        () => recognition.readModelStorage(modelId),
        (cause) => `What the model occupies could not be read: ${cause}`,
      );
      return unwrap(read, storageFailureNote);
    },
    staleTime: 0,
  });
}

function saveSetupMutation(
  recognition: Pick<
    EngineWrites,
    'saveRecognizerSetup' | 'pauseModelLoad' | 'cancelModelLoad' | 'closeRecognizer'
  >,
) {
  return mutationOptions({
    mutationFn: async ({ setup, modelId, abandoned }: SetupChange) => {
      const language = setup.language;
      const saved = await recognition.saveRecognizerSetup(language, {
        modelId,
        compute: setup.compute,
      });
      if (abandoned === null) await recognition.pauseModelLoad(language);
      else await recognition.cancelModelLoad(language, abandoned);
      await recognition.closeRecognizer(language);
      return saved;
    },
  });
}

function grantConsentMutation(recognition: Pick<EngineWrites, 'grantModelConsent'>) {
  return mutationOptions({
    mutationFn: (language: Language) => recognition.grantModelConsent(language),
  });
}

function prepareRecognizerMutation(recognition: Pick<EngineWrites, 'prepareRecognizer'>) {
  return mutationOptions({
    mutationFn: ({ language, onProgress }: DownloadRequest) =>
      recognition.prepareRecognizer(language, { onProgress }),
  });
}

function pauseDownloadMutation(recognition: Pick<EngineWrites, 'pauseModelLoad'>) {
  return mutationOptions({
    mutationFn: (language: Language) => recognition.pauseModelLoad(language),
  });
}

function cancelDownloadMutation(recognition: Pick<EngineWrites, 'cancelModelLoad'>) {
  return mutationOptions({
    mutationFn: ({ language, modelId }: ModelTarget) =>
      recognition.cancelModelLoad(language, modelId),
  });
}

function deleteModelMutation(recognition: Pick<EngineWrites, 'cancelModelLoad' | 'deleteModel'>) {
  return mutationOptions({
    mutationFn: async ({ language, modelId }: ModelTarget) => {
      await recognition.cancelModelLoad(language, modelId);
      return recognition.deleteModel(language, modelId);
    },
  });
}

export {
  NO_MODEL,
  cancelDownloadMutation,
  computeQuery,
  consentReadNote,
  deleteModelMutation,
  grantConsentMutation,
  modelConsentQuery,
  modelStorageQuery,
  offeredModels,
  pauseDownloadMutation,
  prepareRecognizerMutation,
  recognizerSetupQuery,
  saveSetupMutation,
  setupReadNote,
  storageFailureNote,
};
export type {
  DownloadRequest,
  EngineReads,
  EngineWrites,
  LanguageSetup,
  ModelTarget,
  OfferedModels,
  SetupChange,
};
