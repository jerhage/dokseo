import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import {
  HOME_ROOT_FEED,
  HOME_SEARCH,
  HOME_SERIES_FEED,
  feedAddress,
  placed,
  withoutSearch,
} from '../domain/catalog-feed-fixtures';
import type { CatalogFeed, FeedAddress, FeedSearch, TrailStep } from '../domain/catalog-feed';
import type { BookOriginLink } from '../domain/remote-item';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { HOME } from './catalog-ui-fixtures';

const ROOT_URL = 'https://home.test/opds';

function feedAnswer(
  feed: CatalogFeed,
  url: string,
  path: readonly TrailStep[],
  held = new Map<string, BookOriginLink>(),
) {
  const answer: BrowseCatalogResult = {
    kind: 'success',
    reading: placed(feed, feedAddress(url), path),
    held,
  };
  return answer;
}

type Call = {
  id: CatalogId;
  url: FeedAddress | null;
  path: readonly TrailStep[];
  signal: AbortSignal | undefined;
};

type SearchCall = { search: FeedSearch; query: string; path: readonly TrailStep[] };

const SEARCH_ADDRESS = 'https://home.test/opds/search/star%20voyage';

function setup(
  answer: (call: Call) => Promise<BrowseCatalogResult>,
  answerSearch: (call: SearchCall) => Promise<BrowseCatalogResult> = (call) =>
    Promise.resolve(feedAnswer(HOME_SERIES_FEED, SEARCH_ADDRESS, call.path)),
) {
  const calls: Call[] = [];
  const searches: SearchCall[] = [];
  const unlocked: string[] = [];
  const revoked: string[] = [];
  const session = new CatalogSession();
  const downloads = new CatalogDownloads(
    {
      downloadPublication: () => Promise.resolve({ kind: 'aborted' }),
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined, updated: () => undefined },
  );
  const covers = new CatalogCovers(
    () => Promise.resolve({ kind: 'success', image: new Blob(['x']) }),
    { create: () => 'blob:1', revoke: (url) => revoked.push(url) },
  );
  const view = new CatalogBrowseView(
    HOME,
    {
      browseCatalog: (id, url, path, signal) => {
        const call = { id, url, path, signal };
        calls.push(call);
        return answer(call);
      },
      searchCatalog: (_id, search, query, path) => {
        const call = { search, query, path };
        searches.push(call);
        return answerSearch(call);
      },
      unlockCatalog: (_id, password) => {
        unlocked.push(password);
        return { kind: 'success' };
      },
    },
    session,
    downloads,
    covers,
  );
  return { view, calls, searches, unlocked, revoked, session, downloads };
}

function byUrl(call: Call): Promise<BrowseCatalogResult> {
  if (call.url === null) return Promise.resolve(feedAnswer(HOME_ROOT_FEED, ROOT_URL, call.path));
  return Promise.resolve(feedAnswer(HOME_SERIES_FEED, call.url.handle, call.path));
}

const SERIES_LINK = {
  title: 'By Series',
  address: feedAddress('https://home.test/opds/navcatalog/4e736572696573?library_id=calibre'),
  summary: '',
};

describe('CatalogBrowseView', () => {
  it('reads the root feed first and lists its links', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    expect(calls[0]).toMatchObject({ url: null, path: [] });
    expect(view.state.kind).toBe('navigation');
  });

  it('reads the feed once however often it starts', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.start();
    expect(calls).toHaveLength(1);
  });

  it('opens a link as a step and shows that feed', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(calls[1]?.url).toEqual(SERIES_LINK.address);
    expect(calls[1]?.path).toEqual([{ title: 'By Series', address: SERIES_LINK.address }]);
    expect(view.state.kind).toBe('acquisition');
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
  });

  it('returns to the root instead of adding a step when a link loads the root feed again', async () => {
    const { view } = setup((call) =>
      Promise.resolve(feedAnswer(HOME_ROOT_FEED, call.url?.handle ?? ROOT_URL, call.path)),
    );
    await view.start();
    await view.openLink({ ...SERIES_LINK, title: 'Library: calibre' });
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
    expect(view.position.address).toEqual(SERIES_LINK.address);
  });

  it('appends a step when the loaded feed has an id the path lacks', async () => {
    const { view, session } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(view.position.ids).toEqual(['urn:calibre:main', 'calibre-series:星の旅']);
    expect(session.positionOf(HOME.id).ids).toEqual(view.position.ids);
  });

  it('goes back to an earlier feed by its crumb', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    view.crumbs[0]?.onselect();
    await Promise.resolve();
    expect(calls.at(-1)).toMatchObject({ url: null, path: [] });
  });

  it('opens a search result as a feed with a Search step', async () => {
    const { view, searches, session } = setup(byUrl);
    await view.start();
    await view.search('star voyage');
    expect(searches).toEqual([
      {
        search: HOME_SEARCH,
        query: 'star voyage',
        path: [{ title: 'Search: star voyage', address: null }],
      },
    ]);
    expect(view.crumbs.at(-1)?.label).toBe('Search: star voyage');
    expect(view.position.address).toEqual(feedAddress(SEARCH_ADDRESS));
    expect(view.position.path).toEqual([
      { title: 'Search: star voyage', address: feedAddress(SEARCH_ADDRESS) },
    ]);
    expect(session.positionOf(HOME.id).lookup).toBeNull();
  });

  it('searches from a feed that lacks a search link by the one the root offered', async () => {
    const { view, searches } = setup((call) =>
      Promise.resolve(
        call.url === null
          ? feedAnswer(HOME_ROOT_FEED, ROOT_URL, call.path)
          : feedAnswer(withoutSearch(HOME_SERIES_FEED), call.url.handle, call.path),
      ),
    );
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(view.feedSearch).not.toBeNull();
    await view.search('moon');
    expect(searches.at(-1)?.search).toEqual(HOME_SEARCH);
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual([HOME.title, 'Search: moon']);
  });

  it('does not search for an empty query', async () => {
    const { view, calls, searches } = setup(byUrl);
    await view.start();
    await view.search('   ');
    expect(calls).toHaveLength(1);
    expect(searches).toEqual([]);
  });

  it('returns to the feed the search began on when an empty query is submitted', async () => {
    const { view, calls, session } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await view.search('moon');
    await view.search('  ');
    expect(calls.at(-1)).toMatchObject({
      url: SERIES_LINK.address,
      path: [{ title: 'By Series', address: SERIES_LINK.address }],
    });
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
    expect(session.searchOriginOf(HOME.id)).toBeNull();
  });

  it('keeps the first feed as the origin across repeated searches', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await view.search('moon');
    await view.search('sun');
    await view.search('');
    expect(calls.at(-1)?.url).toEqual(SERIES_LINK.address);
  });

  it('returns to the root when the search began there', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.search('moon');
    await view.search('');
    expect(calls.at(-1)).toMatchObject({ url: null, path: [] });
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
  });

  it('makes no request for an empty query when no search is shown', async () => {
    const { view, calls, searches } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await view.search('');
    expect(calls).toHaveLength(2);
    expect(searches).toEqual([]);
  });

  it('makes no new request for the query already shown', async () => {
    const { view, searches } = setup(byUrl);
    await view.start();
    await view.search('moon');
    await view.search(' moon ');
    expect(searches).toHaveLength(1);
  });

  it('aborts the older search and ignores its late answer', async () => {
    const resolvers: Array<(answer: BrowseCatalogResult) => void> = [];
    const { view } = setup(byUrl, () => new Promise((resolve) => resolvers.push(resolve)));
    await view.start();
    const first = view.search('moon');
    const second = view.search('sun');
    resolvers[0]?.(feedAnswer(HOME_SERIES_FEED, 'https://home.test/stale', []));
    await first;
    expect(view.state.kind).toBe('loading');
    resolvers[1]?.(feedAnswer(HOME_SERIES_FEED, SEARCH_ADDRESS, []));
    await second;
    expect(view.state.kind).toBe('acquisition');
    expect(view.position.address).toEqual(feedAddress(SEARCH_ADDRESS));
  });

  it('forgets the search origin once the reader leaves the result by a crumb', async () => {
    const { view, calls } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await view.search('moon');
    await view.goToDepth(0);
    const requests = calls.length;
    await view.search('');
    expect(calls).toHaveLength(requests);
  });

  it('searches again when a failed search is retried', async () => {
    let failing = true;
    const { view, searches } = setup(byUrl, (call) =>
      Promise.resolve(
        failing ? { kind: 'offline' } : feedAnswer(HOME_SERIES_FEED, SEARCH_ADDRESS, call.path),
      ),
    );
    await view.start();
    await view.search('moon');
    expect(view.state.kind).toBe('failed');
    failing = false;
    await view.load();
    expect(searches.map((call) => call.query)).toEqual(['moon', 'moon']);
    expect(view.state.kind).toBe('acquisition');
  });

  it('records the position in the session', async () => {
    const { view, session } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    expect(session.positionOf(HOME.id).path).toHaveLength(1);
  });

  it('resumes at the position the session holds', async () => {
    const first = setup(byUrl);
    await first.view.start();
    await first.view.openLink(SERIES_LINK);
    const calls: Call[] = [];
    const resumed = new CatalogBrowseView(
      HOME,
      {
        browseCatalog: (id, url, path, signal) => {
          calls.push({ id, url, path, signal });
          return byUrl({ id, url, path, signal });
        },
        searchCatalog: () => Promise.resolve({ kind: 'aborted' }),
        unlockCatalog: () => ({ kind: 'success' }),
      },
      first.session,
      first.downloads,
      new CatalogCovers(() => Promise.resolve({ kind: 'not-found' })),
    );
    await resumed.start();
    expect(calls[0]?.url).toEqual(SERIES_LINK.address);
    expect(resumed.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
  });

  it('hands the held entries to the downloads', async () => {
    const held = new Map([
      [
        'urn:uuid:11111111-2222-3333-4444-555555555555',
        { bookId: bookId('b'), updated: '2026-08-15T12:30:00+00:00' },
      ],
    ]);
    const { view, downloads } = setup((call) =>
      Promise.resolve(
        call.url === null
          ? feedAnswer(HOME_ROOT_FEED, ROOT_URL, call.path)
          : feedAnswer(HOME_SERIES_FEED, call.url.handle, call.path, held),
      ),
    );
    await view.start();
    await view.openLink(SERIES_LINK);
    if (view.state.kind !== 'acquisition') throw new Error('expected an acquisition feed');
    const [first] = view.state.feed.publications;
    expect(first && downloads.itemFor(first).kind).toBe('held');
  });

  it('revokes the cover urls when the feed changes', async () => {
    const { view, revoked } = setup(byUrl);
    await view.start();
    await view.openLink(SERIES_LINK);
    await Promise.resolve();
    await Promise.resolve();
    await view.goToDepth(0);
    expect(revoked.length).toBeGreaterThan(0);
  });

  it('shows only the latest of two overlapping loads', async () => {
    const waiting: ((answer: BrowseCatalogResult) => void)[] = [];
    const { view } = setup((call) => {
      if (call.url === null)
        return Promise.resolve(feedAnswer(HOME_ROOT_FEED, ROOT_URL, call.path));
      return new Promise((resolve) => waiting.push(resolve));
    });
    await view.start();
    const slow = view.openLink(SERIES_LINK);
    const fast = view.goToDepth(0);
    await fast;
    waiting[0]?.(feedAnswer(HOME_SERIES_FEED, SERIES_LINK.address.handle, []));
    await slow;
    expect(view.state.kind).toBe('navigation');
  });
});

describe('CatalogBrowseView failures', () => {
  it('asks for the password when the catalog is locked', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'locked', id: HOME.id }));
    await view.start();
    expect(view.state).toEqual({ kind: 'unlock', refused: false });
    expect(view.prompting).toBe(true);
  });

  it('marks the password refused when the server rejects it', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'unauthorized' }));
    await view.start();
    expect(view.state).toEqual({ kind: 'unlock', refused: true });
  });

  it('unlocks with the typed password and reads the feed again', async () => {
    let locked = true;
    const { view, unlocked, calls } = setup((call) => {
      if (locked) return Promise.resolve({ kind: 'locked', id: HOME.id });
      return byUrl(call);
    });
    await view.start();
    locked = false;
    await view.unlock('secret');
    expect(unlocked).toEqual(['secret']);
    expect(calls).toHaveLength(2);
    expect(view.state.kind).toBe('navigation');
    expect(view.prompting).toBe(false);
  });

  it('opens the prompt again when the unlocked password is refused', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'unauthorized' }));
    await view.start();
    await view.unlock('wrong');
    expect(view.state).toEqual({ kind: 'unlock', refused: true });
    expect(view.prompting).toBe(true);
  });

  it('closes the prompt on dismiss without losing the state', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'locked', id: HOME.id }));
    await view.start();
    view.dismissPrompt();
    expect(view.prompting).toBe(false);
    view.askPassword();
    expect(view.prompting).toBe(true);
  });

  it('keeps the failure for the texts', async () => {
    const { view } = setup(() => Promise.resolve({ kind: 'offline' }));
    await view.start();
    expect(view.state).toEqual({ kind: 'failed', failure: { kind: 'offline' } });
  });

  it('retries from the failure with load', async () => {
    let up = false;
    const { view } = setup((call) => (up ? byUrl(call) : Promise.resolve({ kind: 'blocked' })));
    await view.start();
    up = true;
    await view.load();
    expect(view.state.kind).toBe('navigation');
  });
});
