import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
} from '../domain/model-consent';

export type ReadModelConsentDeps = {
  readonly consent: ModelConsentStore;
};

export function readModelConsent(
  deps: ReadModelConsentDeps,
  language: Language,
): Promise<Result<ModelConsentDecision, ModelConsentError>> {
  return deps.consent.decisionFor(language);
}
