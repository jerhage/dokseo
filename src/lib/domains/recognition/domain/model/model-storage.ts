import type { Result } from '$lib/shared/result';
import type { ModelStorageReport } from './model-cache';

type ModelStorageError =
  | { readonly kind: 'cache-unavailable' }
  | { readonly kind: 'cache-failed'; readonly cause: string };

interface ModelStorage {
  measure(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>>;
  remove(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>>;
}

export type { ModelStorageError, ModelStorage };
