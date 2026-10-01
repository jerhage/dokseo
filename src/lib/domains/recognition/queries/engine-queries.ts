import { queryOptions } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { QueryFailure, unwrap } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice, GpuDetection } from '../domain/engine/compute-choice';
import type { RecognizerChoice, SetupError } from '../domain/engine/recognizer-setup';
import { modelsFor } from '../domain/model/model-footprint';
import type { ModelFootprint } from '../domain/model/model-footprint';
import type { ModelStorageError } from '../domain/model/model-storage';
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
  readonly readModelStorage: (
    modelId: string,
  ) => Promise<Result<ModelStorageSnapshot, ModelStorageError>>;
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
    throw new QueryFailure(note(describeCause(cause)));
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

export {
  NO_MODEL,
  computeQuery,
  modelStorageQuery,
  offeredModels,
  recognizerSetupQuery,
  setupReadNote,
  storageFailureNote,
};
export type { EngineReads, LanguageSetup, OfferedModels };
