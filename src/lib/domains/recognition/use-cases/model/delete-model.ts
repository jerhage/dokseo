import type { Language } from '$lib/shared/language';
import type { ModelConsentStore } from '../../domain/model/model-consent';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelStorage } from '../../domain/model/model-storage';
import type { PartialDownloads } from '../../domain/model/partial-downloads';

type DeleteModelResult =
  | { readonly kind: 'success'; readonly report: ModelStorageReport }
  | { readonly kind: 'cache-unavailable' };

type DeleteModelDeps = {
  readonly storage: ModelStorage;
  readonly partials: PartialDownloads;
  readonly consent: ModelConsentStore;
};

async function deleteModel(
  deps: DeleteModelDeps,
  language: Language,
  modelId: string,
): Promise<DeleteModelResult> {
  const removed = await deps.storage.remove(modelId);
  if (removed.kind !== 'success') return removed;

  await deps.partials.discard(modelId);
  await deps.consent.forgetGrant(language);
  return removed;
}

export { deleteModel };
export type { DeleteModelDeps, DeleteModelResult };
