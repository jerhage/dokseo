import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { ModelConsentError, ModelConsentStore } from '../domain/model-consent';

export type GrantModelConsentDeps = {
  readonly consent: ModelConsentStore;
  readonly requestPersistence: () => Promise<boolean>;
};

export async function grantModelConsent(
  deps: GrantModelConsentDeps,
  language: Language,
): Promise<Result<void, ModelConsentError>> {
  await deps.requestPersistence();
  return deps.consent.recordGrant(language);
}
