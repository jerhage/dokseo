import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import { modelFootprint } from './model-footprint';

export type ModelConsentDecision = 'granted' | 'undecided';

export type ModelConsentError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

export type StoredModelConsent = {
  readonly language: Language;
  readonly grantedAt: number;
  readonly modelId?: string | null;
  readonly weightsBytes?: number | null;
};

export type ModelConsent = {
  readonly language: Language;
  readonly grantedAt: number;
  readonly modelId: string | null;
  readonly weightsBytes: number | null;
};

export function consentFromStored(stored: StoredModelConsent): ModelConsent {
  return {
    ...stored,
    modelId: stored.modelId ?? null,
    weightsBytes: stored.weightsBytes ?? null,
  };
}

export function grantedConsent(language: Language, grantedAt: number): StoredModelConsent {
  const footprint = modelFootprint(language);
  return {
    language,
    grantedAt,
    modelId: footprint?.modelId ?? null,
    weightsBytes: footprint?.weightsBytes ?? null,
  };
}

export function decisionOf(consent: ModelConsent | null, language: Language): ModelConsentDecision {
  const current = modelFootprint(language);
  if (consent === null || current === null) return 'undecided';

  return consent.modelId === current.modelId ? 'granted' : 'undecided';
}

export interface ModelConsentStore {
  decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>>;
  recordGrant(language: Language): Promise<Result<void, ModelConsentError>>;
}
