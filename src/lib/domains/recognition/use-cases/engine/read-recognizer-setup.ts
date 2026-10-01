import type { Language } from '$lib/shared/language';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type {
  RecognizerChoice,
  RecognizerSetupStore,
  SetupError,
} from '../../domain/engine/recognizer-setup';

type ReadRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

async function readRecognizerSetup(
  deps: ReadRecognizerSetupDeps,
  language: Language,
): Promise<Result<RecognizerChoice, SetupError>> {
  const record = await deps.setups.read(language);
  if (!record.ok) return record;

  return ok(setupChoice(language, record.value));
}

export { readRecognizerSetup };
export type { ReadRecognizerSetupDeps };
