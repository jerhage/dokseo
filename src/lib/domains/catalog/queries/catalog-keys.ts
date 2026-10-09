import type { CatalogId } from '$lib/shared/ids';
import type { FeedLocation } from '../domain/catalog-feed';

const ALL = ['catalog'] as const;

const catalogKeys = {
  all: () => ALL,
  catalogs: () => [...ALL, 'catalogs'] as const,
  origins: () => [...ALL, 'origins'] as const,
  held: (catalogId: CatalogId) => [...ALL, 'origins', catalogId] as const,
  feeds: (catalogId: CatalogId) => [...ALL, 'feed', catalogId] as const,
  feed: (catalogId: CatalogId, location: FeedLocation) =>
    [...ALL, 'feed', catalogId, location] as const,
  covers: (catalogId: CatalogId) => [...ALL, 'cover', catalogId] as const,
  cover: (catalogId: CatalogId, href: string) => [...ALL, 'cover', catalogId, href] as const,
};

export { catalogKeys };
