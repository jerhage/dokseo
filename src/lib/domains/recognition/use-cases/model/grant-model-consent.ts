import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { ModelConsentError, ModelConsentStore } from '../../domain/model/model-consent';
import { setupChoice, type RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

export type GrantModelConsentDeps = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
  readonly requestPersistence: () => Promise<boolean>;
};

export async function grantModelConsent(
  deps: GrantModelConsentDeps,
  language: Language,
): Promise<Result<void, ModelConsentError>> {
  const record = await deps.setups.read(language);
  const chosen = setupChoice(language, record.ok ? record.value : null);

  await deps.requestPersistence();
  return await deps.consent.recordGrant(language, chosen.model);
}
