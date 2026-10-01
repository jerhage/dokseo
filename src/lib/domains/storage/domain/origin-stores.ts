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

interface OriginStores {
  survey(): Promise<OriginSurvey>;
}

export type { CachedFile, StoredFile, OriginSurvey, OriginStores };
