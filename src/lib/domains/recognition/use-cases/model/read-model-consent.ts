import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../../domain/model/model-consent';
import { setupChoice, type RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

export type ReadModelConsentDeps = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
};

export async function readModelConsent(
  deps: ReadModelConsentDeps,
  language: Language,
): Promise<Result<ModelConsentDecision, ModelConsentError>> {
  const record = await deps.setups.read(language);
  const chosen = setupChoice(language, record.ok ? record.value : null);

  return await deps.consent.decisionFor(language, chosen.model);
}
