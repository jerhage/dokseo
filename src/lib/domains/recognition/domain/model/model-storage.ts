import type { Result } from '$lib/shared/result';
import type { ModelStorageReport } from './model-cache';

export type ModelStorageError =
  | { readonly kind: 'cache-unavailable' }
  | { readonly kind: 'cache-failed'; readonly cause: string };

export interface ModelStorage {
  measure(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>>;
  remove(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>>;
}
