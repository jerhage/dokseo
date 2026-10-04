import { isNumber, isNumberOrNull, isStoredFields, isTextOrNull } from '$lib/shared/corrupt-row';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { reads } from './model-footprint';
import type { ModelFootprint } from './model-footprint';

type ModelConsentDecision = 'granted' | 'undecided';

type ConsentLookup =
  | { readonly kind: 'success'; readonly decision: ModelConsentDecision }
  | StorageUnavailable;

type ConsentWrite = { readonly kind: 'success' } | StorageUnavailable;

type ModelConsent = {
  readonly language: Language;
  readonly grantedAt: number;
  readonly modelId: string | null;
  readonly weightsBytes: number | null;
};

function consentFromStored(stored: unknown): ModelConsent | null {
  if (!isStoredFields(stored)) return null;
  const { language, grantedAt, modelId, weightsBytes } = stored;
  if (!isLanguage(language) || !isNumber(grantedAt)) return null;
  if (!isTextOrNull(modelId) || !isNumberOrNull(weightsBytes)) return null;
  return { language, grantedAt, modelId, weightsBytes };
}

function grantedConsent(
  language: Language,
  grantedAt: number,
  model: ModelFootprint | null,
): ModelConsent {
  return {
    language,
    grantedAt,
    modelId: model?.modelId ?? null,
    weightsBytes: model?.weightsBytes ?? null,
  };
}

function decisionOf(
  consent: ModelConsent | null,
  model: ModelFootprint | null,
): ModelConsentDecision {
  if (consent === null || model === null) return 'undecided';
  if (!reads(model, consent.language)) return 'undecided';

  return consent.modelId === model.modelId ? 'granted' : 'undecided';
}

interface ModelConsentStore {
  decisionFor(language: Language, model: ModelFootprint | null): Promise<ConsentLookup>;
  recordGrant(language: Language, model: ModelFootprint | null): Promise<ConsentWrite>;
  forgetGrant(language: Language): Promise<ConsentWrite>;
}

export { consentFromStored, grantedConsent, decisionOf };
export type { ConsentLookup, ConsentWrite, ModelConsentDecision, ModelConsent, ModelConsentStore };
