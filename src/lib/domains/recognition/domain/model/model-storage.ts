import type { ModelStorageReport } from './model-cache';

type ModelCacheRead =
  | { readonly kind: 'success'; readonly report: ModelStorageReport }
  | { readonly kind: 'cache-unavailable' };

interface ModelStorage {
  measure(modelId: string): Promise<ModelCacheRead>;
  remove(modelId: string): Promise<ModelCacheRead>;
}

export type { ModelCacheRead, ModelStorage };
