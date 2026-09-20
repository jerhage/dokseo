import type { Language } from '$lib/shared/language';
import { ok, type Result } from '$lib/shared/result';
import { computeChoiceOf } from '../domain/compute-choice';
import { chosenModel } from '../domain/model-footprint';
import type {
  RecognizerChoice,
  RecognizerSetupStore,
  SetupError,
} from '../domain/recognizer-setup';

export type ReadRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

export async function readRecognizerSetup(
  deps: ReadRecognizerSetupDeps,
  language: Language,
): Promise<Result<RecognizerChoice, SetupError>> {
  const record = await deps.setups.read(language);
  const stored = record.ok ? record.value : null;
  const choice: RecognizerChoice = {
    model: chosenModel(language, stored?.modelId ?? null),
    compute: computeChoiceOf(stored?.compute),
  };

  return ok(choice);
}
