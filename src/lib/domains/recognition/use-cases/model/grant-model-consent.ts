import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ModelConsentStore } from '../../domain/model/model-consent';
import { storedChoice } from '../../domain/engine/recognizer-setup';
import type { RecognizerSetupStore } from '../../domain/engine/recognizer-setup';

type GrantModelConsentResult = { readonly kind: 'success' } | StorageUnavailable;

type GrantModelConsentDeps = {
  readonly consent: ModelConsentStore;
  readonly setups: RecognizerSetupStore;
  readonly requestPersistence: () => Promise<boolean>;
};

async function grantModelConsent(
  deps: GrantModelConsentDeps,
  language: Language,
): Promise<GrantModelConsentResult> {
  const record = await deps.setups.read(language);
  const chosen = storedChoice(language, record);

  await deps.requestPersistence();
  const recorded = await deps.consent.recordGrant(language, chosen.model);
  return recorded;
}

export { grantModelConsent };
export type { GrantModelConsentDeps, GrantModelConsentResult };
