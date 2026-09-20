import type { Result } from '$lib/shared/result';

export type CachedFile = {
  readonly url: string;
  readonly bytes: number | null;
};

export type StoredFile = {
  readonly place: string;
  readonly bytes: number | null;
};

export type OriginSurvey = {
  readonly cached: readonly CachedFile[] | null;
  readonly files: readonly StoredFile[] | null;
};

export type OriginStoresError = { readonly kind: 'survey-failed'; readonly cause: string };

export interface OriginStores {
  survey(): Promise<Result<OriginSurvey, OriginStoresError>>;
}
