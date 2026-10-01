import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { reads } from './model-footprint';
import type { ModelFootprint } from './model-footprint';

type ModelConsentDecision = 'granted' | 'undecided';

type ConsentLookup =
  | { readonly kind: 'success'; readonly decision: ModelConsentDecision }
  | StorageUnavailable;

type ConsentWrite = { readonly kind: 'success' } | StorageUnavailable;

type StoredModelConsent = {
  readonly language: Language;
  readonly grantedAt: number;
  readonly modelId?: string | null;
  readonly weightsBytes?: number | null;
};

type ModelConsent = {
  readonly language: Language;
  readonly grantedAt: number;
  readonly modelId: string | null;
  readonly weightsBytes: number | null;
};

function consentFromStored(stored: StoredModelConsent): ModelConsent {
  return {
    ...stored,
    modelId: stored.modelId ?? null,
    weightsBytes: stored.weightsBytes ?? null,
  };
}

function grantedConsent(
  language: Language,
  grantedAt: number,
  model: ModelFootprint | null,
): StoredModelConsent {
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
export type {
  ConsentLookup,
  ConsentWrite,
  ModelConsentDecision,
  StoredModelConsent,
  ModelConsent,
  ModelConsentStore,
};
