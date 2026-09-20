import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import { computeChoiceOf } from './compute-choice';
import type { ComputeChoice } from './compute-choice';
import { chosenModel } from '../model/model-footprint';
import type { ModelFootprint } from '../model/model-footprint';

type RecognizerSetup = {
  readonly modelId: string;
  readonly compute: ComputeChoice;
};

type RecognizerChoice = {
  readonly model: ModelFootprint | null;
  readonly compute: ComputeChoice;
};

type SetupError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

type StoredRecognizerSetup = {
  readonly language: Language;
  readonly modelId?: string | null;
  readonly compute?: string | null;
};

function storedSetup(language: Language, setup: RecognizerSetup): StoredRecognizerSetup {
  return { language, modelId: setup.modelId, compute: setup.compute };
}

function setupChoice(language: Language, stored: StoredRecognizerSetup | null): RecognizerChoice {
  return {
    model: chosenModel(language, stored?.modelId ?? null),
    compute: computeChoiceOf(stored?.compute),
  };
}

interface RecognizerSetupStore {
  read(language: Language): Promise<Result<StoredRecognizerSetup | null, SetupError>>;
  write(language: Language, setup: RecognizerSetup): Promise<Result<void, SetupError>>;
}

export { storedSetup, setupChoice };
export type {
  RecognizerSetup,
  RecognizerChoice,
  SetupError,
  StoredRecognizerSetup,
  RecognizerSetupStore,
};
