import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { ComputeChoice } from './compute-choice';
import type { ModelFootprint } from './model-footprint';

export type RecognizerSetup = {
  readonly modelId: string;
  readonly compute: ComputeChoice;
};

export type RecognizerChoice = {
  readonly model: ModelFootprint | null;
  readonly compute: ComputeChoice;
};

export type SetupError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

export type StoredRecognizerSetup = {
  readonly language: Language;
  readonly modelId?: string | null;
  readonly compute?: string | null;
};

export function storedSetup(language: Language, setup: RecognizerSetup): StoredRecognizerSetup {
  return { language, modelId: setup.modelId, compute: setup.compute };
}

export interface RecognizerSetupStore {
  read(language: Language): Promise<Result<StoredRecognizerSetup | null, SetupError>>;
  write(language: Language, setup: RecognizerSetup): Promise<Result<void, SetupError>>;
}
