import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { HOME_ROOT_FEED, HOME_SERIES_FEED, placed } from '../domain/catalog-feed-fixtures';
import type { CatalogFeed } from '../domain/catalog-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogSession } from './catalog-session.svelte';
import { CatalogTabsView } from './catalog-tabs.svelte';
import type { CatalogTabsUseCases } from './catalog-tabs.svelte';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { LibraryHistory } from './library-history';
import type { HistoryPort, HistoryTargets, LibraryHistoryState } from './library-history';
import { DEVICE_TAB } from './library-tabs';

const FIRST = 'urn:uuid:11111111-2222-3333-4444-555555555555';
const SERIES_LINK = {
  title: 'By Series',
  href: 'https://home.test/opds/navcatalog/4e736572696573?library_id=calibre',
  summary: '',
};

const MIDDLE_LINK = { title: 'Middle', href: 'https://home.test/opds/middle', summary: '' };

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function state(tab: string, feed = 0, detail: string | null = null): LibraryHistoryState {
  return { tab, feed, detail, entry: `foreign-${tab}-${feed}` };
}

function shapes(entries: readonly (LibraryHistoryState | undefined)[]) {
  return entries.map((entry) =>
    entry === undefined ? undefined : { tab: entry.tab, feed: entry.feed, detail: entry.detail },
  );
}

function plain(tab: string, feed = 0, detail: string | null = null) {
  return { tab, feed, detail };
}

class FakeBrowser {
  entries: (LibraryHistoryState | undefined)[] = [undefined];
  at = 0;
  observe: (next: LibraryHistoryState | undefined) => void = () => undefined;

  readonly port: HistoryPort = {
    push: (next) => {
      this.entries = [...this.entries.slice(0, this.at + 1), next];
      this.at += 1;
    },
    replace: (next) => {
      this.entries[this.at] = next;
    },
    back: () => this.go(-1),
    go: (delta) => this.go(delta),
  };

  go(delta: number): void {
    this.at += delta;
    this.observe(this.entries[this.at]);
  }
}

describe('LibraryHistory', () => {
  function recorded() {
    const browser = new FakeBrowser();
    const restored: string[] = [];
    const indexes = new Map<string, number>();
    const targets: HistoryTargets = {
      selected: () => DEVICE_TAB,
      feedIndex: (tab) => indexes.get(tab) ?? 0,
      restoreTab: (tab) => restored.push(`tab ${tab}`),
      restoreFeed: (tab, feed) => restored.push(`feed ${tab} ${feed}`),
      restoreDetail: (tab, detail) => restored.push(`detail ${tab} ${detail}`),
    };
    const history = new LibraryHistory(browser.port, targets);
    browser.observe = (next) => history.observe(next);
    return { browser, history, restored, indexes };
  }

  it('records nothing before the page has arrived', () => {
    const { browser, history } = recorded();
    history.moved('home', 'push');
    history.detailOpened('home', 'a');
    expect(shapes(browser.entries)).toEqual([undefined]);
  });

  it('stamps the entry it arrives on with the selected tab and its feed', () => {
    const { browser, history } = recorded();
    history.arrive();
    expect(shapes(browser.entries)).toEqual([plain(DEVICE_TAB)]);
  });

  it('pushes an entry for a move that goes deeper', () => {
    const { browser, history, indexes } = recorded();
    history.arrive();
    indexes.set('home', 1);
    history.moved('home', 'push');
    expect(shapes(browser.entries)).toEqual([plain(DEVICE_TAB), plain('home', 1)]);
  });

  it('replaces the entry for a move that goes up or across', () => {
    const { browser, history } = recorded();
    history.arrive();
    history.moved('home', 'replace');
    expect(shapes(browser.entries)).toEqual([plain('home')]);
  });

  it('pushes an entry when details open', () => {
    const { browser, history } = recorded();
    history.arrive();
    history.detailOpened(DEVICE_TAB, 'one');
    expect(shapes(browser.entries)).toEqual([plain(DEVICE_TAB), plain(DEVICE_TAB, 0, 'one')]);
  });

  it('goes back once when the details that pushed the current entry close', () => {
    const { browser, history, restored } = recorded();
    history.arrive();
    history.detailOpened(DEVICE_TAB, 'one');
    history.detailClosed();
    expect(browser.at).toBe(0);
    expect(restored).toEqual([]);
  });

  it('goes back nowhere when the current entry holds no details', () => {
    const { browser, history } = recorded();
    history.arrive();
    history.detailClosed();
    expect(browser.at).toBe(0);
  });

  it('restores the details of an entry it comes back to', () => {
    const { browser, history, restored } = recorded();
    history.arrive();
    history.detailOpened('home', 'x');
    browser.go(-1);
    browser.go(1);
    expect(restored).toEqual(['tab device', 'detail device null', 'tab home', 'detail home x']);
  });

  it('restores the feed of a catalog entry only when the session is elsewhere', () => {
    const { browser, history, restored, indexes } = recorded();
    history.arrive();
    indexes.set('home', 1);
    history.moved('home', 'push');
    indexes.set('home', 2);
    history.moved('home', 'push');
    browser.go(-1);
    expect(restored).toEqual(['tab home', 'feed home 1', 'detail home null']);
    indexes.set('home', 1);
    browser.go(-1);
    expect(restored.slice(3)).toEqual(['tab device', 'detail device null']);
  });

  it('ignores a state of another route', () => {
    const { history, restored } = recorded();
    history.arrive();
    history.observe(undefined);
    expect(restored).toEqual([]);
  });
});

describe('the library history across the tabs and the feeds', () => {
  function library() {
    const browser = new FakeBrowser();
    const session = new CatalogSession();
    const cases: CatalogTabsUseCases = {
      listCatalogs: () =>
        Promise.resolve({ kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] }),
      browseCatalog: (_id, url, path): Promise<BrowseCatalogResult> => {
        const middle: CatalogFeed =
          HOME_ROOT_FEED.kind === 'navigation'
            ? { kind: 'navigation', feed: { ...HOME_ROOT_FEED.feed, id: 'middle' } }
            : HOME_ROOT_FEED;
        const reading =
          url === null
            ? placed(HOME_ROOT_FEED, 'https://home.test/opds', path)
            : url === MIDDLE_LINK.href
              ? placed(middle, url, path)
              : placed(HOME_SERIES_FEED, url, path);
        return Promise.resolve({ kind: 'success', reading, held: new Map() });
      },
      searchCatalog: (_id, _search, _query, path) =>
        Promise.resolve({
          kind: 'success',
          reading: placed(HOME_SERIES_FEED, 'https://home.test/opds/search/moon', path),
          held: new Map(),
        }),
      unlockCatalog: () => ({ kind: 'success' }),
      readCatalogCover: () => Promise.resolve({ kind: 'not-found' }),
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
      downloadPublication: () => Promise.resolve({ kind: 'success', bookId: bookId('new') }),
    };
    const deviceDetail: (string | null)[] = [];
    const tabs: CatalogTabsView = new CatalogTabsView(session, {
      cases,
      notify: () => undefined,
      matching: () => DEFAULT_BOOK_MATCHING,
      defaults: () => INITIAL_READING_DEFAULTS,
      describeOpenFile: () => '',
      openBook: () => undefined,
      refreshLibrary: () => Promise.resolve(),
      history: {
        moved: (tab, mode) => history.moved(tab, mode),
        detailOpened: (tab, detail) => history.detailOpened(tab, detail),
        detailClosed: () => history.detailClosed(),
        walkedBack: (tab, feed) => history.walkedBack(tab, feed),
      },
    });
    const history: LibraryHistory = new LibraryHistory(browser.port, {
      selected: () => tabs.selected,
      feedIndex: (tab) => tabs.feedIndex(tab),
      restoreTab: (tab) => tabs.restoreTab(tab),
      restoreFeed: (tab, feed) => tabs.restoreFeed(tab, feed),
      restoreDetail: (tab, detail) => {
        tabs.restoreDetail(tab, detail);
        deviceDetail.push(tab === DEVICE_TAB ? detail : null);
      },
    });
    browser.observe = (next) => history.observe(next);
    return { browser, history, tabs, session, deviceDetail };
  }

  async function atHome() {
    const setup = library();
    await setup.tabs.load();
    setup.history.arrive();
    setup.tabs.select(HOME.id);
    const home = setup.tabs.browsing(HOME);
    await home.start();
    return { ...setup, home };
  }

  it('replaces the entry when a tab is chosen, since the tabs are parallel views', async () => {
    const { browser } = await atHome();
    expect(shapes(browser.entries)).toEqual([plain(HOME.id)]);
  });

  it('pushes one entry for each feed opened', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    expect(shapes(browser.entries)).toEqual([plain(HOME.id), plain(HOME.id, 1)]);
  });

  it('shows the earlier feed again when the browser goes back, as a crumb would', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    browser.go(-1);
    await settle();
    expect(home.crumbs.map((crumb) => crumb.label)).toEqual(['Home']);
    expect(home.state.kind).toBe('navigation');
  });

  it('shows the deeper feed again when the browser goes forward', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    browser.go(-1);
    await settle();
    browser.go(1);
    await settle();
    expect(home.crumbs.map((crumb) => crumb.label)).toEqual(['Home', 'By Series']);
    expect(home.state.kind).toBe('acquisition');
  });

  it('walks back one entry when a crumb goes up one level', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    await home.goToDepth(0);
    await settle();
    expect(browser.at).toBe(0);
    expect(home.crumbs).toHaveLength(1);
    expect(home.state.kind).toBe('navigation');
  });

  async function deepHome() {
    const setup = await atHome();
    await setup.home.openLink(MIDDLE_LINK);
    await setup.home.openLink(SERIES_LINK);
    return setup;
  }

  it('walks back two entries at once when a crumb goes up two levels', async () => {
    const { browser, home } = await deepHome();
    expect(browser.at).toBe(2);
    await home.goToDepth(0);
    await settle();
    expect(browser.at).toBe(0);
    expect(home.crumbs).toHaveLength(1);
    expect(home.state.kind).toBe('navigation');
  });

  it('goes back past the feed a crumb returned to, with no repeated feed', async () => {
    const { browser, home } = await deepHome();
    await home.goToDepth(1);
    await settle();
    expect(browser.at).toBe(1);
    expect(home.crumbs).toHaveLength(2);
    browser.go(-1);
    await settle();
    expect(browser.at).toBe(0);
    expect(home.crumbs).toHaveLength(1);
  });

  it('shows the deeper feed again when the browser goes forward after a crumb', async () => {
    const { browser, home } = await deepHome();
    await home.goToDepth(0);
    await settle();
    browser.go(2);
    await settle();
    expect(home.crumbs).toHaveLength(3);
    expect(home.state.kind).toBe('acquisition');
  });

  it('replaces the entry when a crumb goes up after the page was reloaded', async () => {
    const { browser, home, history } = await deepHome();
    history.arrive();
    await home.goToDepth(0);
    expect(shapes(browser.entries).at(-1)).toEqual(plain(HOME.id, 2));
    expect(browser.at).toBe(2);
    expect(home.crumbs).toHaveLength(1);
  });

  it('goes back when the search it began is left by an empty query', async () => {
    const { browser, home, session } = await atHome();
    session.type(HOME.id, 'moon');
    await home.search('moon');
    expect(browser.at).toBe(1);
    await home.search('');
    await settle();
    expect(browser.at).toBe(0);
    expect(home.state.kind).toBe('navigation');
    expect(session.queryOf(HOME.id)).toBe('');
  });

  it('replaces the search entry when the page was reloaded before the search was left', async () => {
    const { browser, home, history } = await atHome();
    await home.search('moon');
    history.arrive();
    await home.search('');
    expect(browser.at).toBe(1);
    expect(shapes(browser.entries).at(-1)).toEqual(plain(HOME.id, 1));
  });

  it('pushes details and closes them when the browser goes back', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    home.openDetails(FIRST);
    expect(shapes(browser.entries).at(-1)).toEqual(plain(HOME.id, 1, FIRST));
    expect(home.opened).not.toBeNull();
    browser.go(-1);
    expect(home.opened).toBeNull();
    expect(home.crumbs).toHaveLength(2);
  });

  it('goes back once when the details close, and stays on the feed', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    home.openDetails(FIRST);
    home.closeDetails();
    expect(browser.at).toBe(1);
    expect(home.crumbs).toHaveLength(2);
    expect(home.opened).toBeNull();
  });

  it('opens the details again when the browser goes forward', async () => {
    const { browser, home } = await atHome();
    await home.openLink(SERIES_LINK);
    home.openDetails(FIRST);
    home.closeDetails();
    browser.go(1);
    expect(home.opened?.publication.entryId).toBe(FIRST);
  });

  it('pushes the first search and replaces the refinements', async () => {
    const { browser, home } = await atHome();
    await home.search('mo');
    await home.search('moon');
    expect(shapes(browser.entries)).toEqual([plain(HOME.id), plain(HOME.id, 1)]);
  });

  it('goes back from search results to the feed the search began on, with no query', async () => {
    const { browser, home, session } = await atHome();
    session.type(HOME.id, 'moon');
    await home.search('moon');
    browser.go(-1);
    await settle();
    expect(home.state.kind).toBe('navigation');
    expect(session.queryOf(HOME.id)).toBe('');
  });

  it('leaves the feed alone for an entry the session never held', async () => {
    const { browser, home } = await atHome();
    browser.entries.push(state(HOME.id, 5));
    browser.go(1);
    await settle();
    expect(home.crumbs).toHaveLength(1);
    expect(home.state.kind).toBe('navigation');
  });

  it('returns to the tab an earlier entry names', async () => {
    const { browser, tabs } = await atHome();
    browser.entries = [state(DEVICE_TAB), state(HOME.id)];
    browser.at = 1;
    browser.go(-1);
    expect(tabs.selected).toBe(DEVICE_TAB);
  });
});
