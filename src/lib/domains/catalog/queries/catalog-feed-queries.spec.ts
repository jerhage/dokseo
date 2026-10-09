import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { PagedFailure } from '$lib/shared/paged-failure';
import { knownTotal, unknownTotal } from '$lib/shared/read-paged-state';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import {
  HOME_ROOT_FEED,
  HOME_SEARCH,
  HOME_SERIES_FEED,
  feedAddress,
} from '../domain/catalog-feed-fixtures';
import type { FeedPage, FeedLocation, TrailStep } from '../domain/catalog-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { catalogKeys } from './catalog-keys';
import {
  FEED_GC_MS,
  FEED_STALE_MS,
  catalogCoverQuery,
  catalogFeedQuery,
  heldOriginsQuery,
  nextPageParamOf,
  pageOrFailure,
  totalOfPages,
} from './catalog-feed-queries';
import type { FeedProblem, FeedReads } from './catalog-feed-queries';

const HOME = catalogId('home');
const ARCHIVE = catalogId('archive');
const PATH: readonly TrailStep[] = [
  { title: 'By Series', address: feedAddress('https://x.test/s') },
];

type Asked =
  | {
      readonly kind: 'browse';
      readonly address: string | null;
      readonly path: readonly TrailStep[];
    }
  | { readonly kind: 'search'; readonly query: string };

function feedsAnswering(answer: (asked: Asked) => BrowseCatalogResult) {
  const asked: Asked[] = [];
  const feeds: FeedReads = {
    browseCatalog: (_id, address, path) => {
      const one: Asked = { kind: 'browse', address: address?.handle ?? null, path };
      asked.push(one);
      return Promise.resolve(answer(one));
    },
    searchCatalog: (_id, _search, query) => {
      const one: Asked = { kind: 'search', query };
      asked.push(one);
      return Promise.resolve(answer(one));
    },
  };
  return { feeds, asked };
}

const SERIES: FeedLocation = { kind: 'address', address: feedAddress('https://x.test/s') };

const PROBLEMS: readonly FeedProblem[] = [
  { kind: 'locked', id: HOME },
  { kind: 'unauthorized' },
  { kind: 'not-a-catalog' },
  { kind: 'not-found' },
  { kind: 'server-error', status: 503 },
  { kind: 'blocked' },
  { kind: 'offline' },
  { kind: 'unknown-catalog', id: HOME },
  { kind: 'unreadable-catalog', id: HOME },
  { kind: 'storage-unavailable' },
];

describe('catalogKeys feeds', () => {
  it('files a feed under its catalog and tells the root, an address and a search apart', () => {
    const keys = [
      catalogKeys.feed(HOME, { kind: 'root' }),
      catalogKeys.feed(HOME, SERIES),
      catalogKeys.feed(HOME, { kind: 'search', search: HOME_SEARCH, query: 'moon' }),
    ];

    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3);
    for (const key of keys) expect(key.slice(0, 3)).toEqual(catalogKeys.feeds(HOME));
  });

  it('keeps the feeds of two catalogs apart', () => {
    expect(catalogKeys.feed(HOME, { kind: 'root' })).not.toEqual(
      catalogKeys.feed(ARCHIVE, { kind: 'root' }),
    );
  });

  it('files the held read under the origins key, so an origins refresh reaches it', () => {
    expect(catalogKeys.held(HOME).slice(0, 2)).toEqual(catalogKeys.origins());
  });

  it('files a cover under its catalog and its address', () => {
    expect(catalogKeys.cover(HOME, 'https://x.test/c.png').slice(0, 3)).toEqual(
      catalogKeys.covers(HOME),
    );
  });
});

describe('pageOrFailure', () => {
  it('returns the page of a success', () => {
    expect(pageOrFailure({ kind: 'success', page: HOME_ROOT_FEED })).toBe(HOME_ROOT_FEED);
  });

  it.each(PROBLEMS)('throws a PagedFailure carrying $kind', (problem) => {
    let thrown: unknown = null;
    try {
      pageOrFailure(problem);
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toBeInstanceOf(PagedFailure);
    expect(thrown instanceof PagedFailure && thrown.failure).toBe(problem);
  });

  it('throws a plain error, not a PagedFailure, for a cancelled read', () => {
    let thrown: unknown = null;
    try {
      pageOrFailure({ kind: 'aborted' });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(PagedFailure);
  });
});

describe('nextPageParamOf', () => {
  it('follows the next address of the last page', () => {
    expect(nextPageParamOf(HOME_SERIES_FEED)).toEqual(HOME_SERIES_FEED.next);
  });

  it('ends at a page without a next address', () => {
    expect(nextPageParamOf(HOME_ROOT_FEED)).toBeUndefined();
  });
});

describe('totalOfPages', () => {
  it('reads the total of the first page', () => {
    const counted: FeedPage = { ...HOME_ROOT_FEED, total: knownTotal(40) };

    expect(totalOfPages([counted, HOME_SERIES_FEED])).toEqual(knownTotal(40));
  });

  it('reports an unknown total before a page has loaded', () => {
    expect(totalOfPages([])).toEqual(unknownTotal());
  });
});

describe('catalogFeedQuery', () => {
  it('reads the root with no address, then the next page by its address', async () => {
    const { feeds, asked } = feedsAnswering((one) =>
      one.kind === 'browse' && one.address === null
        ? { kind: 'success', page: HOME_SERIES_FEED }
        : { kind: 'success', page: HOME_ROOT_FEED },
    );
    const client = createTestQueryClient();

    const data = await client.fetchInfiniteQuery({
      ...catalogFeedQuery(feeds, HOME, { kind: 'root' }, []),
      pages: 2,
    });

    expect(data.pages).toEqual([HOME_SERIES_FEED, HOME_ROOT_FEED]);
    expect(asked.map((one) => one.kind === 'browse' && one.address)).toEqual([
      null,
      HOME_SERIES_FEED.next?.handle,
    ]);
  });

  it('reads an address location from that address with the path it is given', async () => {
    const { feeds, asked } = feedsAnswering(() => ({ kind: 'success', page: HOME_ROOT_FEED }));

    await createTestQueryClient().fetchInfiniteQuery(catalogFeedQuery(feeds, HOME, SERIES, PATH));

    expect(asked).toEqual([{ kind: 'browse', address: 'https://x.test/s', path: PATH }]);
  });

  it('searches a search location with the trimmed query', async () => {
    const { feeds, asked } = feedsAnswering(() => ({ kind: 'success', page: HOME_ROOT_FEED }));

    await createTestQueryClient().fetchInfiniteQuery(
      catalogFeedQuery(feeds, HOME, { kind: 'search', search: HOME_SEARCH, query: ' moon ' }, []),
    );

    expect(asked).toEqual([{ kind: 'search', query: 'moon' }]);
  });

  it('shares one key between a search and the same search typed with spaces', () => {
    const { feeds } = feedsAnswering(() => ({ kind: 'success', page: HOME_ROOT_FEED }));
    const keyOf = (query: string) =>
      catalogFeedQuery(feeds, HOME, { kind: 'search', search: HOME_SEARCH, query }, []).queryKey;

    expect(keyOf(' moon ')).toEqual(keyOf('moon'));
  });

  it.each(PROBLEMS)('rejects with a PagedFailure carrying $kind', async (problem) => {
    const { feeds } = feedsAnswering(() => problem);

    const failure = await createTestQueryClient()
      .fetchInfiniteQuery(catalogFeedQuery(feeds, HOME, { kind: 'root' }, []))
      .catch((cause: unknown) => cause);

    expect(failure instanceof PagedFailure && failure.failure).toBe(problem);
  });

  it('keeps a page for the stale time and a long while after nobody watches', () => {
    const { feeds } = feedsAnswering(() => ({ kind: 'success', page: HOME_ROOT_FEED }));
    const options = catalogFeedQuery(feeds, HOME, { kind: 'root' }, []);

    expect(options.staleTime).toBe(FEED_STALE_MS);
    expect(options.gcTime).toBe(FEED_GC_MS);
    expect(FEED_GC_MS).toBeGreaterThan(FEED_STALE_MS);
  });
});

describe('catalogCoverQuery', () => {
  it('reads the image of the address unchanged', async () => {
    const image = new Blob(['x']);
    const asked: string[] = [];
    const options = catalogCoverQuery(
      {
        readCatalogCover: (_id, href) => {
          asked.push(href);
          return Promise.resolve({ kind: 'success', image });
        },
      },
      HOME,
      'https://x.test/c.png',
    );

    const read = await createTestQueryClient().fetchQuery(options);

    expect(read).toBe(image);
    expect(asked).toEqual(['https://x.test/c.png']);
  });

  it('reads the image with no abort signal, so replacing the observers of a cover never cancels it', async () => {
    const signals: unknown[] = [];
    const options = catalogCoverQuery(
      {
        readCatalogCover: (...args) => {
          signals.push(args[2]);
          return Promise.resolve({ kind: 'success', image: new Blob(['x']) });
        },
      },
      HOME,
      'https://x.test/c.png',
    );

    await createTestQueryClient().fetchQuery(options);

    expect(signals).toEqual([undefined]);
  });

  it('rejects when the image cannot be read', async () => {
    const options = catalogCoverQuery(
      { readCatalogCover: () => Promise.resolve({ kind: 'offline' }) },
      HOME,
      'https://x.test/c.png',
    );

    await expect(createTestQueryClient().fetchQuery(options)).rejects.toThrow();
  });

  it('never goes stale in the session and never compares a blob as json', () => {
    const options = catalogCoverQuery(
      { readCatalogCover: () => Promise.resolve({ kind: 'offline' }) },
      HOME,
      'https://x.test/c.png',
    );

    expect(options.staleTime).toBe(Infinity);
    expect(options.structuralSharing).toBe(false);
  });
});

describe('heldOriginsQuery', () => {
  it('reads the held entries of the catalog unchanged', async () => {
    const asked: string[] = [];
    const answer = { kind: 'success', held: new Map() } as const;
    const options = heldOriginsQuery(
      {
        heldOrigins: (id) => {
          asked.push(id);
          return Promise.resolve(answer);
        },
      },
      HOME,
    );

    expect(await createTestQueryClient().fetchQuery(options)).toBe(answer);
    expect(asked).toEqual([HOME]);
    expect(options.queryKey).toEqual(catalogKeys.held(HOME));
  });
});
