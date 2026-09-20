import type { Language } from '$lib/shared/language';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type {
  RecognizerChoice,
  RecognizerSetupStore,
  SetupError,
} from '../../domain/engine/recognizer-setup';

export type ReadRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

export async function readRecognizerSetup(
  deps: ReadRecognizerSetupDeps,
  language: Language,
): Promise<Result<RecognizerChoice, SetupError>> {
  const record = await deps.setups.read(language);
  const stored = record.ok ? record.value : null;

  return ok(setupChoice(language, stored));
}
