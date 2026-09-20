import type { Result } from '$lib/shared/result';

type CachedFile = {
  readonly url: string;
  readonly bytes: number | null;
};

type StoredFile = {
  readonly place: string;
  readonly bytes: number | null;
};

type OriginSurvey = {
  readonly cached: readonly CachedFile[] | null;
  readonly files: readonly StoredFile[] | null;
};

type OriginStoresError = { readonly kind: 'survey-failed'; readonly cause: string };

interface OriginStores {
  survey(): Promise<Result<OriginSurvey, OriginStoresError>>;
}

export type { CachedFile, StoredFile, OriginSurvey, OriginStoresError, OriginStores };
