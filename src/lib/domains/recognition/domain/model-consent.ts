import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';

export type ModelConsentDecision = 'granted' | 'undecided';

export type ModelConsentError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

export interface ModelConsentStore {
  decisionFor(language: Language): Promise<Result<ModelConsentDecision, ModelConsentError>>;
  recordGrant(language: Language): Promise<Result<void, ModelConsentError>>;
}
