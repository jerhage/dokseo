import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import type { InfiniteData } from '@tanstack/svelte-query';
import type { CatalogId } from '$lib/shared/ids';
import { PagedFailure } from '$lib/shared/paged-failure';
import { unknownTotal } from '$lib/shared/read-paged-state';
import type { Total } from '$lib/shared/read-paged-state';
import type {
  FeedAddress,
  FeedLocation,
  FeedPage,
  FeedSearch,
  TrailStep,
} from '../domain/catalog-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import type { HeldOriginsResult } from '../use-cases/held-origins';
import type { ReadCatalogCoverResult } from '../use-cases/read-catalog-cover';
import type { SearchCatalogResult } from '../use-cases/search-catalog';
import { catalogKeys } from './catalog-keys';

type FeedReads = {
  readonly browseCatalog: (
    id: CatalogId,
    address: FeedAddress | null,
    path: readonly TrailStep[],
    signal?: AbortSignal,
  ) => Promise<BrowseCatalogResult>;
  readonly searchCatalog: (
    id: CatalogId,
    search: FeedSearch,
    query: string,
    path: readonly TrailStep[],
    signal?: AbortSignal,
  ) => Promise<SearchCatalogResult>;
};

type CoverReads = {
  readonly readCatalogCover: (
    id: CatalogId,
    href: string,
    signal?: AbortSignal,
  ) => Promise<ReadCatalogCoverResult>;
};

type HeldReads = {
  readonly heldOrigins: (id: CatalogId) => Promise<HeldOriginsResult>;
};

type FeedProblem = Exclude<BrowseCatalogResult, { readonly kind: 'success' | 'aborted' }>;

type FeedPageParam = FeedAddress | null;

type FeedKey = ReturnType<typeof catalogKeys.feed>;

const FIRST_PAGE: FeedPageParam = null;

const FEED_STALE_MS = 5 * 60 * 1000;

const FEED_GC_MS = 30 * 60 * 1000;

function normalizedLocation(location: FeedLocation): FeedLocation {
  if (location.kind !== 'search') return location;
  return { kind: 'search', search: location.search, query: location.query.trim() };
}

function pageOrFailure(result: BrowseCatalogResult): FeedPage {
  if (result.kind === 'success') return result.page;
  if (result.kind === 'aborted') throw new Error('The catalog read was cancelled.');
  throw new PagedFailure<FeedProblem>(result);
}

function readPage(
  feeds: FeedReads,
  catalogId: CatalogId,
  location: FeedLocation,
  after: FeedPageParam,
  path: readonly TrailStep[],
  signal: AbortSignal,
): Promise<BrowseCatalogResult> {
  if (after !== null) return feeds.browseCatalog(catalogId, after, path, signal);
  if (location.kind === 'search') {
    return feeds.searchCatalog(catalogId, location.search, location.query, path, signal);
  }
  const address = location.kind === 'address' ? location.address : null;
  return feeds.browseCatalog(catalogId, address, path, signal);
}

function nextPageParamOf(last: FeedPage): FeedPageParam | undefined {
  return last.next ?? undefined;
}

function totalOfPages(pages: readonly FeedPage[]): Total {
  return pages[0]?.total ?? unknownTotal();
}

function catalogFeedQuery(
  feeds: FeedReads,
  catalogId: CatalogId,
  location: FeedLocation,
  path: readonly TrailStep[],
) {
  const wanted = normalizedLocation(location);
  return infiniteQueryOptions<
    FeedPage,
    Error,
    InfiniteData<FeedPage, FeedPageParam>,
    FeedKey,
    FeedPageParam
  >({
    queryKey: catalogKeys.feed(catalogId, wanted),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParamOf,
    queryFn: async ({ pageParam, signal }): Promise<FeedPage> => {
      const result = await readPage(feeds, catalogId, wanted, pageParam, path, signal);
      return pageOrFailure(result);
    },
    staleTime: FEED_STALE_MS,
    gcTime: FEED_GC_MS,
  });
}

function catalogCoverQuery(covers: CoverReads, catalogId: CatalogId, href: string) {
  return queryOptions({
    queryKey: catalogKeys.cover(catalogId, href),
    queryFn: async (): Promise<Blob> => {
      const read = await covers.readCatalogCover(catalogId, href);
      if (read.kind !== 'success') throw new Error(`The cover could not be read (${read.kind}).`);
      return read.image;
    },
    staleTime: Infinity,
    structuralSharing: false,
  });
}

function heldOriginsQuery(held: HeldReads, catalogId: CatalogId) {
  return queryOptions({
    queryKey: catalogKeys.held(catalogId),
    queryFn: () => held.heldOrigins(catalogId),
    staleTime: 0,
  });
}

export {
  FEED_GC_MS,
  FEED_STALE_MS,
  catalogCoverQuery,
  catalogFeedQuery,
  heldOriginsQuery,
  nextPageParamOf,
  pageOrFailure,
  totalOfPages,
};
export type { CoverReads, FeedKey, FeedPageParam, FeedProblem, FeedReads, HeldReads };
