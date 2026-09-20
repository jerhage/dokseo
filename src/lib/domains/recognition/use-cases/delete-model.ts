import type { Language } from '$lib/shared/language';
import type { Result } from '$lib/shared/result';
import type { ModelConsentStore } from '../domain/model-consent';
import type { ModelStorageReport } from '../domain/model-cache';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';

export type DeleteModelDeps = {
  readonly storage: ModelStorage;
  readonly consent: ModelConsentStore;
};

export async function deleteModel(
  deps: DeleteModelDeps,
  language: Language,
  modelId: string,
): Promise<Result<ModelStorageReport, ModelStorageError>> {
  const removed = await deps.storage.remove(modelId);
  if (!removed.ok) return removed;

  await deps.consent.forgetGrant(language);
  return removed;
}
