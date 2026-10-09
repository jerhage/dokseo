import { partialMatchKey } from '@tanstack/svelte-query';
import type { InfiniteData, QueryClient } from '@tanstack/svelte-query';
import { createSubscriber } from 'svelte/reactivity';
import type { CatalogId } from '$lib/shared/ids';
import type { FeedPage } from '../domain/catalog-feed';
import { catalogKeys } from '../queries/catalog-keys';
import { normalizedLocation } from '../queries/catalog-feed-queries';
import type { FeedPageParam } from '../queries/catalog-feed-queries';
import { readingOfCached } from './feed-reading';
import type { FeedReading } from './feed-reading';
import { feedLocationOf } from './navigation';
import type { Place } from './navigation';

type FeedReadings = {
  readonly of: (catalog: CatalogId, place: Place) => FeedReading | undefined;
};

function createFeedReadings(client: QueryClient): FeedReadings {
  const cache = client.getQueryCache();
  const subscribe = createSubscriber((update) =>
    cache.subscribe((event) => {
      if (partialMatchKey(event.query.queryKey, catalogKeys.anyFeed())) update();
    }),
  );

  return {
    of(catalog, place) {
      subscribe();
      const query = cache.find<FeedPage, Error, InfiniteData<FeedPage, FeedPageParam>>({
        queryKey: catalogKeys.feed(catalog, normalizedLocation(feedLocationOf(place))),
        exact: true,
      });
      return readingOfCached(query?.state);
    },
  };
}

export { createFeedReadings };
export type { FeedReadings };
