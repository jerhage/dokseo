import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { HOME_ROOT_FEED, feedAddress } from '../domain/catalog-feed-fixtures';
import type { NavigationLink } from '../domain/catalog-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { catalogFeedQuery } from '../queries/catalog-feed-queries';
import type { FeedReads } from '../queries/catalog-feed-queries';
import { DEVICE_TAB } from './library-tabs';
import { linkReaderFor, readFirstPage, resolvingKeyOf } from './link-resolution';

const HOME = catalogId('home');

const LINK: NavigationLink = {
  title: 'Library: calibre',
  address: feedAddress('https://home.test/opds'),
  summary: '',
};

function feedsAnswering(result: BrowseCatalogResult) {
  let reads = 0;
  const feeds: FeedReads = {
    browseCatalog: () => {
      reads += 1;
      return Promise.resolve(result);
    },
    searchCatalog: () => Promise.reject(new Error('not asked')),
  };
  return { feeds, reads: () => reads };
}

describe('readFirstPage', () => {
  it('reports the id of the first page and leaves it in the cache', async () => {
    const { feeds, reads } = feedsAnswering({ kind: 'success', page: HOME_ROOT_FEED });
    const client = createTestQueryClient();

    const id = await readFirstPage(client, feeds, HOME, { kind: 'root' }, []);
    await client.fetchInfiniteQuery(catalogFeedQuery(feeds, HOME, { kind: 'root' }, []));

    expect(id).toBe(HOME_ROOT_FEED.id);
    expect(reads()).toBe(1);
  });

  it('reports no id for a feed that cannot be read', async () => {
    const { feeds } = feedsAnswering({ kind: 'offline' });

    const id = await readFirstPage(createTestQueryClient(), feeds, HOME, { kind: 'root' }, []);

    expect(id).toBeNull();
  });

  it('reads nothing for the device tab', async () => {
    const { feeds, reads } = feedsAnswering({ kind: 'success', page: HOME_ROOT_FEED });

    const id = await readFirstPage(
      createTestQueryClient(),
      feeds,
      DEVICE_TAB,
      { kind: 'root' },
      [],
    );

    expect(id).toBeNull();
    expect(reads()).toBe(0);
  });
});

describe('linkReaderFor', () => {
  it('reports the id of the first page of the linked feed', async () => {
    const { feeds } = feedsAnswering({ kind: 'success', page: HOME_ROOT_FEED });

    const resolved = await linkReaderFor(createTestQueryClient(), feeds, HOME)(LINK, []);

    expect(resolved).toEqual({ kind: 'feed', feedId: HOME_ROOT_FEED.id });
  });

  it('leaves the page in the cache so that the feed renders without a second read', async () => {
    const { feeds, reads } = feedsAnswering({ kind: 'success', page: HOME_ROOT_FEED });
    const client = createTestQueryClient();

    await linkReaderFor(client, feeds, HOME)(LINK, []);
    await client.fetchInfiniteQuery(
      catalogFeedQuery(feeds, HOME, { kind: 'address', address: LINK.address }, []),
    );

    expect(reads()).toBe(1);
  });

  it('reports a feed that cannot be read as unreadable', async () => {
    const { feeds } = feedsAnswering({ kind: 'offline' });

    const resolved = await linkReaderFor(createTestQueryClient(), feeds, HOME)(LINK, []);

    expect(resolved).toEqual({ kind: 'unreadable' });
  });
});

describe('resolvingKeyOf', () => {
  it('names the link being read on its own tab', () => {
    const opening = { kind: 'resolving', tab: 'home', link: LINK } as const;

    expect(resolvingKeyOf(opening, 'home')).toBe(LINK.address.handle);
  });

  it('names nothing for another tab or when idle', () => {
    const opening = { kind: 'resolving', tab: 'home', link: LINK } as const;

    expect(resolvingKeyOf(opening, 'archive')).toBeNull();
    expect(resolvingKeyOf({ kind: 'idle' }, 'home')).toBeNull();
  });
});
