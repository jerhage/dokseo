import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type {
  RecognizerSetup,
  RecognizerSetupStore,
  SetupError,
} from '../../domain/engine/recognizer-setup';

type SaveRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

function saveRecognizerSetup(
  deps: SaveRecognizerSetupDeps,
  language: Language,
  setup: RecognizerSetup,
): Promise<Result<void, SetupError>> {
  return deps.setups.write(language, setup);
}

export { saveRecognizerSetup };
export type { SaveRecognizerSetupDeps };
