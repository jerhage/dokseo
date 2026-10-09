import type { InfiniteData } from '@tanstack/svelte-query';
import type { FeedPage, FeedSearch } from '../domain/catalog-feed';

type FeedReading =
  | { readonly kind: 'failed' }
  | { readonly kind: 'ready'; readonly search: FeedSearch | null };

type CachedFeed = {
  readonly status: 'pending' | 'error' | 'success';
  readonly data: InfiniteData<FeedPage, unknown> | undefined;
};

function readingOfCached(cached: CachedFeed | undefined): FeedReading | undefined {
  if (cached === undefined) return undefined;
  const first = cached.data?.pages[0];
  if (first !== undefined) return { kind: 'ready', search: first.search };
  return cached.status === 'error' ? { kind: 'failed' } : undefined;
}

export { readingOfCached };
export type { CachedFeed, FeedReading };
