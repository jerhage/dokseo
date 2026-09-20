import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { RecognizerSetup, RecognizerSetupStore, SetupError } from '../domain/recognizer-setup';

export type SaveRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

export function saveRecognizerSetup(
  deps: SaveRecognizerSetupDeps,
  language: Language,
  setup: RecognizerSetup,
): Promise<Result<void, SetupError>> {
  return deps.setups.write(language, setup);
}
