import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import { reads } from './model-footprint';
import type { ModelFootprint } from './model-footprint';

type ModelConsentDecision = 'granted' | 'undecided';

type ModelConsentError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

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
  decisionFor(
    language: Language,
    model: ModelFootprint | null,
  ): Promise<Result<ModelConsentDecision, ModelConsentError>>;
  recordGrant(
    language: Language,
    model: ModelFootprint | null,
  ): Promise<Result<void, ModelConsentError>>;
  forgetGrant(language: Language): Promise<Result<void, ModelConsentError>>;
}

export { consentFromStored, grantedConsent, decisionOf };
export type {
  ModelConsentDecision,
  ModelConsentError,
  StoredModelConsent,
  ModelConsent,
  ModelConsentStore,
};
