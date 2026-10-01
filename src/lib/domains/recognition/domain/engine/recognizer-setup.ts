import { match } from 'ts-pattern';
import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
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

type SetupLookup =
  | { readonly kind: 'success'; readonly stored: StoredRecognizerSetup | null }
  | StorageUnavailable;

type SetupWrite = { readonly kind: 'success' } | StorageUnavailable;

function storedChoice(language: Language, record: SetupLookup): RecognizerChoice {
  return match(record)
    .with({ kind: 'success' }, ({ stored }) => setupChoice(language, stored))
    .with({ kind: 'storage-unavailable' }, () => setupChoice(language, null))
    .exhaustive();
}

interface RecognizerSetupStore {
  read(language: Language): Promise<SetupLookup>;
  write(language: Language, setup: RecognizerSetup): Promise<SetupWrite>;
}

export { storedChoice, storedSetup, setupChoice };
export type {
  RecognizerSetup,
  RecognizerChoice,
  SetupLookup,
  SetupWrite,
  StoredRecognizerSetup,
  RecognizerSetupStore,
};
