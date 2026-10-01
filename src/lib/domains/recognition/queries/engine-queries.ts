import { mutationOptions, queryOptions, skipToken } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { QueryFailure } from '$lib/shared/query-failure';
import { readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ComputeChoice, GpuDetection } from '../domain/engine/compute-choice';
import type { RecognizerSetup } from '../domain/engine/recognizer-setup';
import { modelsFor } from '../domain/model/model-footprint';
import type { ModelFootprint } from '../domain/model/model-footprint';
import type { ModelLoad } from '../domain/model/model-load';
import type { PrepareRecognizerResult } from '../use-cases/engine/prepare-recognizer';
import type { ReadRecognizerSetupResult } from '../use-cases/engine/read-recognizer-setup';
import type { SaveRecognizerSetupResult } from '../use-cases/engine/save-recognizer-setup';
import type { CancelModelLoadResult } from '../use-cases/model/cancel-model-load';
import type { DeleteModelResult } from '../use-cases/model/delete-model';
import type { GrantModelConsentResult } from '../use-cases/model/grant-model-consent';
import type { ReadModelConsentResult } from '../use-cases/model/read-model-consent';
import type { ReadModelStorageResult } from '../use-cases/model/read-model-storage';
import { recognitionKeys } from './recognition-keys';

type OfferedModels = readonly [ModelFootprint, ...ModelFootprint[]];

type LanguageSetup = {
  readonly language: Language;
  readonly models: OfferedModels;
  readonly selected: string | null;
  readonly compute: ComputeChoice;
};

type LanguageSetupRead =
  | { readonly kind: 'success'; readonly setup: LanguageSetup }
  | StorageUnavailable;

type EngineReads = {
  readonly readRecognizerSetup: (language: Language) => Promise<ReadRecognizerSetupResult>;
  readonly detectCompute: () => Promise<GpuDetection>;
  readonly readModelConsent: (language: Language) => Promise<ReadModelConsentResult>;
  readonly readModelStorage: (modelId: string) => Promise<ReadModelStorageResult>;
};

type EngineWrites = {
  readonly saveRecognizerSetup: (
    language: Language,
    setup: RecognizerSetup,
  ) => Promise<SaveRecognizerSetupResult>;
  readonly grantModelConsent: (language: Language) => Promise<GrantModelConsentResult>;
  readonly prepareRecognizer: (
    language: Language,
    notices?: { readonly onProgress?: (load: ModelLoad) => void },
  ) => Promise<PrepareRecognizerResult>;
  readonly pauseModelLoad: (language: Language) => Promise<void>;
  readonly cancelModelLoad: (
    language: Language,
    modelId: string,
  ) => Promise<CancelModelLoadResult | null>;
  readonly closeRecognizer: (language: Language) => Promise<void>;
  readonly deleteModel: (language: Language, modelId: string) => Promise<DeleteModelResult>;
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

function offeredModels(language: Language): OfferedModels {
  const [first, ...rest] = modelsFor(language);
  if (first === undefined) throw new Error(`No recognition model reads ${language}`);
  return [first, ...rest];
}

const SETUP_UNREADABLE = 'This browser blocks local storage, so the engine choice cannot be read.';

const CACHE_UNREADABLE =
  'This browser exposes no cache, so what the model occupies cannot be read.';

function setupState(state: ReadState<LanguageSetupRead>): ReadState<LanguageSetup> {
  return match(state)
    .with({ kind: 'loading' }, { kind: 'failed' }, (unread): ReadState<LanguageSetup> => unread)
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) => readReady(value.setup))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () =>
      readFailed(SETUP_UNREADABLE),
    )
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

async function languageSetup(
  recognition: Pick<EngineReads, 'readRecognizerSetup'>,
  language: Language,
): Promise<LanguageSetupRead> {
  const models = offeredModels(language);
  const read = await described(
    () => recognition.readRecognizerSetup(language),
    (cause) => `The engine choice could not be read: ${cause}`,
  );
  if (read.kind !== 'success') return read;
  const { model, compute } = read.choice;
  return {
    kind: 'success',
    setup: { language, models, selected: model?.modelId ?? null, compute },
  };
}

function recognizerSetupQuery(
  recognition: Pick<EngineReads, 'readRecognizerSetup'>,
  language: Language | null,
) {
  return queryOptions({
    queryKey: recognitionKeys.setup(language),
    queryFn: language === null ? skipToken : () => languageSetup(recognition, language),
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

function modelConsentQuery(
  recognition: Pick<EngineReads, 'readModelConsent'>,
  language: Language | null,
) {
  return queryOptions({
    queryKey: recognitionKeys.consent(language),
    queryFn:
      language === null ? skipToken : () => described(() => recognition.readModelConsent(language)),
    staleTime: 0,
  });
}

function modelStorageQuery(
  recognition: Pick<EngineReads, 'readModelStorage'>,
  modelId: string | null,
) {
  return queryOptions({
    queryKey: recognitionKeys.modelStorage(modelId),
    queryFn:
      modelId === null
        ? skipToken
        : () =>
            described(
              () => recognition.readModelStorage(modelId),
              (cause) => `What the model occupies could not be read: ${cause}`,
            ),
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
      else await recognition.cancelModelLoad(language, abandoned).catch(() => null);
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
      await recognition.cancelModelLoad(language, modelId).catch(() => null);
      return recognition.deleteModel(language, modelId);
    },
  });
}

export {
  CACHE_UNREADABLE,
  SETUP_UNREADABLE,
  cancelDownloadMutation,
  computeQuery,
  deleteModelMutation,
  grantConsentMutation,
  modelConsentQuery,
  modelStorageQuery,
  offeredModels,
  pauseDownloadMutation,
  prepareRecognizerMutation,
  recognizerSetupQuery,
  saveSetupMutation,
  setupState,
};
export type {
  DownloadRequest,
  EngineReads,
  EngineWrites,
  LanguageSetup,
  LanguageSetupRead,
  ModelTarget,
  OfferedModels,
  SetupChange,
};
