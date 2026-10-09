import type { QueryClient } from '@tanstack/svelte-query';
import type { CatalogId } from '$lib/shared/ids';
import type { NavigationLink, TrailStep } from '../domain/catalog-feed';
import type { Opening } from './catalog-session.svelte';
import { addressKey } from '../domain/catalog-feed';
import { catalogFeedQuery } from '../queries/catalog-feed-queries';
import type { FeedReads } from '../queries/catalog-feed-queries';

type ResolvedLink =
  | { readonly kind: 'feed'; readonly feedId: string }
  | { readonly kind: 'unreadable' };

type LinkReader = (link: NavigationLink, path: readonly TrailStep[]) => Promise<ResolvedLink>;

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

export { linkReaderFor, resolvingKeyOf };
export type { LinkReader, ResolvedLink };
