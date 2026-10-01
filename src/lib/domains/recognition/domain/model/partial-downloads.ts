import type { PartialReport } from './model-partial';

type PartialsRead =
  | { readonly kind: 'success'; readonly report: PartialReport }
  | { readonly kind: 'partials-unavailable' };

interface PartialDownloads {
  measure(modelId: string): Promise<PartialsRead>;
  discard(modelId: string): Promise<PartialsRead>;
}

export type { PartialDownloads, PartialsRead };
