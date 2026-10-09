import type { QueryClient } from '@tanstack/svelte-query';
import { catalogId as catalogOfTab } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import type { FeedLocation, NavigationLink, TrailStep } from '../domain/catalog-feed';
import type { Opening } from './catalog-session.svelte';
import { addressKey } from '../domain/catalog-feed';
import { catalogFeedQuery } from '../queries/catalog-feed-queries';
import type { FeedReads } from '../queries/catalog-feed-queries';
import { DEVICE_TAB } from './library-tabs';

type ResolvedLink =
  | { readonly kind: 'feed'; readonly feedId: string }
  | { readonly kind: 'unreadable' };

type LinkReader = (link: NavigationLink, path: readonly TrailStep[]) => Promise<ResolvedLink>;

type FirstPageReader = (
  tab: string,
  location: FeedLocation,
  path: readonly TrailStep[],
) => Promise<string | null>;

async function readFirstPage(
  client: QueryClient,
  feeds: FeedReads,
  tab: string,
  location: FeedLocation,
  path: readonly TrailStep[],
): Promise<string | null> {
  if (tab === DEVICE_TAB) return null;
  try {
    const data = await client.fetchInfiniteQuery(
      catalogFeedQuery(feeds, catalogOfTab(tab), location, path),
    );
    return data.pages[0]?.id ?? null;
  } catch {
    return null;
  }
}

function linkReaderFor(client: QueryClient, feeds: FeedReads, catalogId: CatalogId): LinkReader {
  return async (link, path) => {
    try {
      const data = await client.fetchInfiniteQuery(
        catalogFeedQuery(feeds, catalogId, { kind: 'address', address: link.address }, path),
      );
      const first = data.pages[0];
      return first === undefined ? { kind: 'unreadable' } : { kind: 'feed', feedId: first.id };
    } catch {
      return { kind: 'unreadable' };
    }
  };
}

function resolvingKeyOf(opening: Opening, tab: string): string | null {
  if (opening.kind !== 'resolving' || opening.tab !== tab) return null;
  return addressKey(opening.link.address);
}

export { linkReaderFor, readFirstPage, resolvingKeyOf };
export type { FirstPageReader, LinkReader, ResolvedLink };
