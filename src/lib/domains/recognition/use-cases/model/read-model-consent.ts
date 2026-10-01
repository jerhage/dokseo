import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ModelConsentDecision, ModelConsentStore } from '../../domain/model/model-consent';
import { storedChoice } from '../../domain/engine/recognizer-setup';
import type { RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

type ReadModelConsentResult =
  | { readonly kind: 'success'; readonly decision: ModelConsentDecision }
  | StorageUnavailable;

type ReadModelConsentDeps = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
};

async function readModelConsent(
  deps: ReadModelConsentDeps,
  language: Language,
): Promise<ReadModelConsentResult> {
  const record = await deps.setups.read(language);
  const chosen = storedChoice(language, record);

  const decided = await deps.consent.decisionFor(language, chosen.model);
  return decided;
}

export { readModelConsent };
export type { ReadModelConsentDeps, ReadModelConsentResult };
