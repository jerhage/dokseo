import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { RecognizerSetup, RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

type SaveRecognizerSetupResult = { readonly kind: 'success' } | StorageUnavailable;

type SaveRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

function saveRecognizerSetup(
  deps: SaveRecognizerSetupDeps,
  language: Language,
  setup: RecognizerSetup,
): Promise<SaveRecognizerSetupResult> {
  return deps.setups.write(language, setup);
}

export { saveRecognizerSetup };
export type { SaveRecognizerSetupDeps, SaveRecognizerSetupResult };
