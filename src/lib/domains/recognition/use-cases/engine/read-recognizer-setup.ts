import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { setupChoice } from '../../domain/engine/recognizer-setup';
import type { RecognizerChoice, RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

type ReadRecognizerSetupResult =
  | { readonly kind: 'success'; readonly choice: RecognizerChoice }
  | StorageUnavailable;

type ReadRecognizerSetupDeps = {
  readonly setups: RecognizerSetupStore;
};

async function readRecognizerSetup(
  deps: ReadRecognizerSetupDeps,
  language: Language,
): Promise<ReadRecognizerSetupResult> {
  const record = await deps.setups.read(language);
  if (record.kind !== 'success') return record;

  return { kind: 'success', choice: setupChoice(language, record.stored) };
}

export { readRecognizerSetup };
export type { ReadRecognizerSetupDeps, ReadRecognizerSetupResult };
