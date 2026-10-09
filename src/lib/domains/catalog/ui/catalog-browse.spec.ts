import { describe, expect, it, vi } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { FeedPage } from '../domain/catalog-feed';
import {
  HOME_ROOT_FEED,
  HOME_SEARCH,
  HOME_SERIES_FEED,
  feedAddress,
  placed,
  publicationEntry,
  withoutSearch,
} from '../domain/catalog-feed-fixtures';
import { CatalogBrowseView } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { CatalogFeedBinding } from './catalog-feed-binding.svelte';
import type { CatalogFeedRead } from './catalog-feed-read';
import { CatalogSession } from './catalog-session.svelte';
import { HOME, publication, readyRead } from './catalog-ui-fixtures';
import type { HistoryRecorder } from './library-history';

const SERIES_LINK = {
  title: 'By Series',
  address: feedAddress('https://home.test/opds/navcatalog/4e736572696573?library_id=calibre'),
  summary: '',
};

const SEARCH_RESULT = feedAddress('https://home.test/opds/search/star%20voyage');

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(session = new CatalogSession()) {
  const unlocked: string[] = [];
  const forgotten: string[] = [];
  const revoked: string[] = [];
  const moves: string[] = [];
  const binding = new CatalogFeedBinding();
  const history: HistoryRecorder = {
    moved: (_id, mode) => moves.push(mode),
    detailOpened: () => undefined,
    detailClosed: () => undefined,
    walkedBack: () => false,
  };
  const downloads = new CatalogDownloads(
    {
      downloadPublication: () => Promise.resolve({ kind: 'aborted' }),
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    { describeOpenFile: () => '', downloaded: () => undefined, updated: () => undefined },
    () => binding.current.held,
  );
  const covers = new CatalogCovers(() => binding.current.covers, {
    create: (blob) => `blob:${blob.size}`,
    revoke: (url) => revoked.push(url),
  });
  const view = new CatalogBrowseView(
    HOME,
    {
      unlockCatalog: (_id, password) => {
        unlocked.push(password);
        return { kind: 'success' };
      },
      forgetDanglingOrigins: (id) => {
        forgotten.push(id);
        return Promise.resolve({ kind: 'success', forgotten: 0 });
      },
    },
    session,
    downloads,
    covers,
    binding,
    history,
  );
  return { view, session, binding, unlocked, forgotten, revoked, moves };
}

function showing(
  world: ReturnType<typeof setup>,
  page: FeedPage,
  overrides: Partial<CatalogFeedRead> = {},
) {
  world.binding.bind(() => readyRead(page, overrides));
  world.view.headLoaded(page);
}

function ids(view: CatalogBrowseView): string[] {
  return view.entries.map(({ publication: held }) => held.entryId);
}

describe('CatalogBrowseView', () => {
  it('starts at the root, reading the root location', () => {
    const { view } = setup();

    expect(view.position.path).toEqual([]);
    expect(view.reading).toEqual({ kind: 'root' });
  });

  it('forgets the dangling origins of the catalog once however often it starts', () => {
    const { view, forgotten } = setup();

    view.start();
    view.start();

    expect(forgotten).toEqual([HOME.id]);
  });

  it('opens a link as a step and reads that feed address', () => {
    const { view, session, moves } = setup();

    view.openLink(SERIES_LINK);

    expect(view.reading).toEqual({ kind: 'address', address: SERIES_LINK.address });
    expect(view.position.path).toEqual([{ title: 'By Series', address: SERIES_LINK.address }]);
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
    expect(session.positionOf(HOME.id).address).toEqual(SERIES_LINK.address);
    expect(moves).toEqual(['push']);
  });

  it('goes back to an earlier feed by its crumb, replacing the history entry', () => {
    const { view, moves } = setup();
    view.openLink(SERIES_LINK);

    view.crumbs[0]?.onselect();

    expect(view.reading).toEqual({ kind: 'root' });
    expect(view.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
    expect(moves).toEqual(['push', 'replace']);
  });

  it('lists the links and the publications of the feed it is bound to', () => {
    const { view, binding } = setup();
    expect(view.entries).toEqual([]);

    binding.bind(() => readyRead(HOME_ROOT_FEED));
    expect(view.links.map((link) => link.title)).toEqual(['By Newest', 'By Series']);

    binding.bind(() => readyRead(HOME_SERIES_FEED));
    expect(ids(view)).toEqual([
      'urn:uuid:11111111-2222-3333-4444-555555555555',
      'urn:uuid:66666666-7777-8888-9999-000000000000',
    ]);
  });

  it('reports the feed as unsettled until the first page has answered', () => {
    const { view, binding } = setup();
    expect(view.feedSettled).toBe(false);

    binding.bind(() => readyRead(HOME_ROOT_FEED));

    expect(view.feedSettled).toBe(true);
  });
});

describe('CatalogBrowseView after a feed loads', () => {
  it('records the id of the feed on its position and in the session', () => {
    const world = setup();
    world.view.openLink(SERIES_LINK);

    showing(world, placed(HOME_SERIES_FEED, SERIES_LINK.address, []));

    expect(world.view.position.ids).toEqual(['', 'calibre-series:星の旅']);
    expect(world.session.positionOf(HOME.id).ids).toEqual(world.view.position.ids);
  });

  it('returns to the root instead of adding a step when a link loads the root feed again', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink({ ...SERIES_LINK, title: 'Library: calibre' });

    showing(world, HOME_ROOT_FEED);

    expect(world.view.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
    expect(world.view.position.address).toEqual(SERIES_LINK.address);
  });

  it('keeps the reading location while the position is settled', () => {
    const world = setup();
    world.view.openLink(SERIES_LINK);
    const reading = world.view.reading;

    showing(world, placed(HOME_SERIES_FEED, SERIES_LINK.address, []));

    expect(world.view.reading).toBe(reading);
  });

  it('remembers the search of the root feed for feeds that lack one', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);

    showing(world, withoutSearch(HOME_SERIES_FEED));

    expect(world.view.feedSearch).toEqual(HOME_SEARCH);
  });

  it('offers no search while no feed has offered one', () => {
    const { view, binding } = setup();
    binding.bind(() => readyRead(withoutSearch(HOME_ROOT_FEED)));

    expect(view.feedSearch).toBeNull();
  });
});

describe('CatalogBrowseView search', () => {
  it('reads a search location and shows a Search step', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);

    world.view.search('star voyage');

    expect(world.view.reading).toEqual({
      kind: 'search',
      search: HOME_SEARCH,
      query: 'star voyage',
    });
    expect(world.view.crumbs.at(-1)?.label).toBe('Search: star voyage');
    expect(world.moves).toEqual(['push']);
  });

  it('points the search step at the address of the result once it loads', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.search('star voyage');

    showing(world, placed(HOME_SERIES_FEED, SEARCH_RESULT, []));

    expect(world.view.position.path).toEqual([
      { title: 'Search: star voyage', address: SEARCH_RESULT },
    ]);
    expect(world.view.reading.kind).toBe('search');
  });

  it('searches from a feed that lacks a search link by the one the root offered', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);
    showing(world, withoutSearch(HOME_SERIES_FEED));

    world.view.search('moon');

    expect(world.view.reading).toMatchObject({ kind: 'search', search: HOME_SEARCH });
    expect(world.view.crumbs.map((crumb) => crumb.label)).toEqual([HOME.title, 'Search: moon']);
  });

  it('changes nothing for an empty query when no search is shown', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);
    const reading = world.view.reading;

    world.view.search('');

    expect(world.view.reading).toBe(reading);
    expect(world.moves).toEqual(['push']);
  });

  it('changes nothing for a query when the feed offers no search', () => {
    const world = setup();
    world.binding.bind(() => readyRead(withoutSearch(HOME_ROOT_FEED)));

    world.view.search('moon');

    expect(world.view.reading).toEqual({ kind: 'root' });
  });

  it('returns to the feed the search began on when an empty query is submitted', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);
    world.view.search('moon');

    world.view.search('  ');

    expect(world.view.reading).toEqual({ kind: 'address', address: SERIES_LINK.address });
    expect(world.view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
    expect(world.session.searchOriginOf(HOME.id)).toBeNull();
  });

  it('keeps the first feed as the origin across repeated searches', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);
    world.view.search('moon');
    world.view.search('sun');

    world.view.search('');

    expect(world.view.reading).toEqual({ kind: 'address', address: SERIES_LINK.address });
  });

  it('returns to the root when the search began there', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.search('moon');

    world.view.search('');

    expect(world.view.reading).toEqual({ kind: 'root' });
    expect(world.view.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
  });

  it('opens one history entry for a search and replaces it while the search is refined', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);

    world.view.search('moon');
    world.view.search('sun');

    expect(world.moves).toEqual(['push', 'replace']);
  });

  it('keeps the reading when the query already shown is submitted again', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.search('moon');
    const reading = world.view.reading;

    world.view.search(' moon ');

    expect(world.view.reading).toBe(reading);
    expect(world.moves).toEqual(['push']);
  });

  it('searches again when the query already shown is submitted after its read failed', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.search('moon');
    world.binding.bind(() => ({
      ...readyRead(HOME_ROOT_FEED),
      state: { kind: 'failed', failure: { kind: 'offline' } },
    }));
    const reading = world.view.reading;

    world.view.search('moon');

    expect(world.view.reading).not.toBe(reading);
  });

  it('forgets the search origin once the reader leaves the result by a crumb', () => {
    const world = setup();
    showing(world, HOME_ROOT_FEED);
    world.view.openLink(SERIES_LINK);
    world.view.search('moon');
    world.view.goToDepth(0);

    world.view.search('');

    expect(world.view.reading).toEqual({ kind: 'root' });
    expect(world.moves).toEqual(['push', 'push', 'replace']);
  });
});

describe('CatalogBrowseView restoring a feed', () => {
  it('resumes at the position the session holds', () => {
    const first = setup();
    first.view.openLink(SERIES_LINK);

    const resumed = setup(first.session);

    expect(resumed.view.reading).toEqual({ kind: 'address', address: SERIES_LINK.address });
    expect(resumed.view.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
  });

  it('shows the feed at a trail index again without touching the history', () => {
    const world = setup();
    world.view.openLink(SERIES_LINK);
    world.session.seek(HOME.id, 0);

    world.view.restoreFeed(0);

    expect(world.view.reading).toEqual({ kind: 'root' });
    expect(world.moves).toEqual(['push']);
  });
});

describe('CatalogBrowseView password', () => {
  it('unlocks with the typed password and reads the feed again', () => {
    const world = setup();
    const reload = vi.fn();
    world.binding.bind(() => ({ ...readyRead(HOME_ROOT_FEED), reload }));

    world.view.unlock('secret');

    expect(world.unlocked).toEqual(['secret']);
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('CatalogBrowseView held entries and covers', () => {
  it('reads the held entries of the feed through the downloads', () => {
    const world = setup();
    const held = new Map([
      [
        'urn:uuid:11111111-2222-3333-4444-555555555555',
        { bookId: bookId('b'), updated: '2026-08-15T12:30:00+00:00' },
      ],
    ]);
    world.binding.bind(() => readyRead(HOME_SERIES_FEED, { held }));

    const first = world.view.entries[0];

    expect(first && world.view.downloads.itemFor(first.publication).kind).toBe('held');
  });

  it('revokes the cover urls when the feed changes', () => {
    const world = setup();
    const image = new Blob(['x']);
    world.binding.bind(() =>
      readyRead(HOME_SERIES_FEED, {
        covers: new Map([['urn:uuid:11111111-2222-3333-4444-555555555555', image]]),
      }),
    );
    world.view.covers.urlOf('urn:uuid:11111111-2222-3333-4444-555555555555');

    world.view.openLink(SERIES_LINK);

    expect(world.revoked).toEqual(['blob:1']);
  });

  it('revokes the cover urls on dispose', () => {
    const world = setup();
    world.binding.bind(() =>
      readyRead(HOME_SERIES_FEED, { covers: new Map([['a', new Blob(['x'])]]) }),
    );
    world.view.covers.urlOf('a');

    world.view.dispose();

    expect(world.revoked).toEqual(['blob:1']);
  });
});

describe('CatalogBrowseView selection', () => {
  const PAGE: FeedPage = {
    ...HOME_SERIES_FEED,
    items: ['p0-0', 'p0-1', 'p1-0'].map((id) => publicationEntry(publication(id))),
  };

  it('restores the selection the session holds', () => {
    const first = setup();
    first.binding.bind(() => readyRead(PAGE));
    first.view.selection.toggle('p1-0');

    const resumed = setup(first.session);
    resumed.binding.bind(() => readyRead(PAGE));

    expect(resumed.view.selection.has('p1-0')).toBe(true);
    expect(resumed.view.selection.count).toBe(1);
  });

  it('clears the selection when another feed opens', () => {
    const world = setup();
    world.binding.bind(() => readyRead(PAGE));
    world.view.selection.toggle('p0-1');

    world.view.goToDepth(0);

    expect(world.view.selection.count).toBe(0);
    expect(world.session.selectionOf(HOME.id).size).toBe(0);
  });

  it('keeps the selection when the loaded feed settles its position', () => {
    const world = setup();
    world.binding.bind(() => readyRead(PAGE));
    world.view.selection.toggle('p0-1');

    showing(world, PAGE);

    expect(world.view.selection.count).toBe(1);
  });
});

function scrollerAt(top: number, scrolled: [number, number][], view: () => CatalogBrowseView) {
  return {
    read: () => top,
    scrollTo: (to: number) => scrolled.push([to, view().entries.length]),
  };
}

describe('CatalogBrowseView scroll memory', () => {
  function resumed(top: number) {
    const session = new CatalogSession();
    session.keepScroll(HOME.id, top);
    const world = setup(session);
    const scrolled: [number, number][] = [];
    world.view.bindScroller(scrollerAt(0, scrolled, () => world.view));
    return { ...world, scrolled };
  }

  it('scrolls to the saved position once the feed is on screen', async () => {
    const world = resumed(1200);
    world.binding.bind(() => readyRead(HOME_SERIES_FEED));

    world.view.headLoaded(HOME_SERIES_FEED);
    await settle();

    expect(world.scrolled).toEqual([[1200, 2]]);
  });

  it('scrolls nowhere when no position was saved', async () => {
    const world = resumed(0);

    world.view.headLoaded(HOME_SERIES_FEED);
    await settle();

    expect(world.scrolled).toEqual([]);
  });

  it('scrolls once, so a later load starts from where the reader is', async () => {
    const world = resumed(1200);

    world.view.headLoaded(HOME_SERIES_FEED);
    world.view.headLoaded(HOME_SERIES_FEED);
    await settle();

    expect(world.scrolled).toHaveLength(1);
  });

  it('scrolls nowhere once the scroller is released', async () => {
    const session = new CatalogSession();
    session.keepScroll(HOME.id, 1200);
    const world = setup(session);
    const scrolled: [number, number][] = [];
    const release = world.view.bindScroller(scrollerAt(0, scrolled, () => world.view));
    release();

    world.view.headLoaded(HOME_SERIES_FEED);
    await settle();

    expect(scrolled).toEqual([]);
  });

  it('does not scroll to a position saved for the feed the reader has left', async () => {
    const world = resumed(1200);
    world.view.openLink(SERIES_LINK);

    world.view.headLoaded(HOME_SERIES_FEED);
    await settle();

    expect(world.scrolled).toEqual([]);
  });

  it('keeps the scroll position of the scroller on leave', () => {
    const session = new CatalogSession();
    const { view } = setup(session);
    view.bindScroller({ read: () => 640, scrollTo: () => undefined });

    view.leave();

    expect(session.takeScroll(HOME.id)).toBe(640);
    expect(session.takeScroll(HOME.id)).toBe(0);
  });

  it('keeps nothing on leave while no scroller is bound', () => {
    const session = new CatalogSession();
    const { view } = setup(session);

    view.leave();

    expect(session.takeScroll(HOME.id)).toBe(0);
  });
});
