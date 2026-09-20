import type { Result } from '$lib/shared/result';
import type { PartialReport } from './model-partial';

export type PartialError =
  | { readonly kind: 'partials-unavailable' }
  | { readonly kind: 'partials-failed'; readonly cause: string };

export interface PartialDownloads {
  measure(modelId: string): Promise<Result<PartialReport, PartialError>>;
  discard(modelId: string): Promise<Result<PartialReport, PartialError>>;
}
