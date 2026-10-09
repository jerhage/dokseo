import { describe, expect, it } from 'vitest';
import { HOME_SEARCH, feedAddress } from '../domain/catalog-feed-fixtures';
import type { NavigationLink } from '../domain/catalog-feed';
import { CatalogSession } from './catalog-session.svelte';
import { createNavigation } from './navigation.svelte';
import type { HistoryPort } from './navigation.svelte';
import type { HistoryState } from './navigation';

const SERIES: NavigationLink = {
  title: 'By Series',
  address: feedAddress('https://home.test/series'),
  summary: '',
};

const VOYAGE: NavigationLink = {
  title: 'Star Voyage',
  address: feedAddress('https://home.test/voyage'),
  summary: '',
};

const HOME = 'home';
const ARCHIVE = 'archive';

class FakeBrowser {
  entries: (HistoryState | null)[] = [null];
  at = 0;
  calls: string[] = [];
  deliver: (state: HistoryState | undefined) => void = () => undefined;

  port: HistoryPort = {
    push: (state) => {
      this.entries = [...this.entries.slice(0, this.at + 1), state];
      this.at += 1;
      this.calls.push('push');
    },
    replace: (state) => {
      this.entries[this.at] = state;
      this.calls.push('replace');
    },
    back: () => this.travel(-1, 'back'),
    go: (delta) => this.travel(delta, `go ${delta}`),
  };

  travel(delta: number, label = 'user'): void {
    const target = this.at + delta;
    if (target < 0 || target >= this.entries.length) return;
    this.calls.push(label);
    this.at = target;
    this.deliver(this.entries[target] ?? undefined);
  }

  get state(): HistoryState | undefined {
    return this.entries[this.at] ?? undefined;
  }
}

function setup() {
  let n = 0;
  const browser = new FakeBrowser();
  const session = new CatalogSession();
  const navigation = createNavigation(session, browser.port, () => `i${++n}`);
  browser.deliver = (state) => navigation.observe(state);
  navigation.arrive(undefined);
  return { browser, session, navigation };
}

function crumbs(navigation: ReturnType<typeof createNavigation>, tab = HOME): string[] {
  return navigation.crumbs(tab, 'Home').map((crumb) => crumb.label);
}

describe('createNavigation arrival', () => {
  it('starts a bare entry at the root of the tab and writes its state', () => {
    const { browser, navigation } = setup();

    expect(browser.calls).toEqual(['replace']);
    expect(browser.state).toEqual({ tab: 'device', entryId: navigation.current.id });
  });

  it('keeps the position of an entry it holds when the library comes back', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    const state = browser.state;
    const calls = browser.calls.length;

    navigation.arrive(state);

    expect(crumbs(navigation)).toEqual(['Home', 'By Series']);
    expect(browser.calls).toHaveLength(calls);
  });

  it('starts every tab at its root when the entry is unknown', () => {
    const { navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);

    navigation.arrive({ tab: HOME, entryId: 'lost' });

    expect(navigation.tab).toBe(HOME);
    expect(crumbs(navigation)).toEqual(['Home']);
  });
});

describe('createNavigation feeds', () => {
  it('pushes exactly one browser entry for every feed it opens', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const before = browser.entries.length;

    navigation.open(HOME, SERIES);
    navigation.open(HOME, VOYAGE);

    expect(browser.entries).toHaveLength(before + 2);
    expect(crumbs(navigation)).toEqual(['Home', 'By Series', 'Star Voyage']);
  });

  it('goes back the number of entries a crumb is below and pushes nothing', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.open(HOME, VOYAGE);
    const entries = browser.entries.length;
    const root = navigation.crumbs(HOME, 'Home')[0]!;

    navigation.goTo(root.place);

    expect(browser.calls.at(-1)).toBe('go -2');
    expect(browser.entries).toHaveLength(entries);
    expect(crumbs(navigation)).toEqual(['Home']);
  });

  it('keeps the deeper feeds ahead so that Forward returns to them', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.open(HOME, VOYAGE);

    browser.travel(-1);
    expect(crumbs(navigation)).toEqual(['Home', 'By Series']);
    browser.travel(1);

    expect(crumbs(navigation)).toEqual(['Home', 'By Series', 'Star Voyage']);
  });

  it('replaces what lay ahead when a feed opens after going back', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    browser.travel(-1);

    navigation.open(HOME, VOYAGE);

    expect(crumbs(navigation)).toEqual(['Home', 'Star Voyage']);
    expect(browser.entries).toHaveLength(browser.at + 1);
  });

  it('ignores a state for an entry it does not hold', () => {
    const { navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);

    navigation.observe({ tab: HOME, entryId: 'unknown' });
    navigation.observe(undefined);

    expect(crumbs(navigation)).toEqual(['Home', 'By Series']);
  });

  it('goes back to the earlier entry instead of repeating a feed it already shows', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const root = navigation.placeOf(HOME)!;
    navigation.identify(root.id, 'urn:root');
    navigation.open(HOME, SERIES);
    const series = navigation.placeOf(HOME)!;
    navigation.identify(series.id, 'urn:series');
    navigation.open(HOME, { ...VOYAGE, title: 'Library: home' });
    const again = navigation.placeOf(HOME)!;

    navigation.identify(again.id, 'urn:root');

    expect(browser.calls.at(-1)).toBe('go -2');
    expect(crumbs(navigation)).toEqual(['Home']);
  });

  it('never goes back for an empty feed id', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    const place = navigation.placeOf(HOME)!;
    const calls = browser.calls.length;

    navigation.identify(place.id, '');

    expect(browser.calls).toHaveLength(calls);
  });

  it('does not go back when the reader already left the entry that was identified', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const root = navigation.placeOf(HOME)!;
    navigation.identify(root.id, 'urn:root');
    navigation.open(HOME, SERIES);
    const series = navigation.placeOf(HOME)!;
    browser.travel(-1);
    const calls = browser.calls.length;

    navigation.identify(series.id, 'urn:root');

    expect(browser.calls).toHaveLength(calls);
  });
});

describe('createNavigation search', () => {
  it('pushes the first search on top of the feed it began on', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    const entries = browser.entries.length;

    navigation.search(HOME, HOME_SEARCH, 'moon');

    expect(browser.entries).toHaveLength(entries + 1);
    expect(crumbs(navigation)).toEqual(['Home', 'By Series', 'Search: moon']);
  });

  it('replaces the search entry when the query changes and pushes nothing', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.search(HOME, HOME_SEARCH, 'moo');
    const entries = browser.entries.length;
    const entry = navigation.current.id;

    navigation.search(HOME, HOME_SEARCH, 'moon');

    expect(browser.entries).toHaveLength(entries);
    expect(navigation.current.id).toBe(entry);
    expect(crumbs(navigation)).toEqual(['Home', 'Search: moon']);
  });

  it('forgets the selection and scroll kept for the search it replaces', () => {
    const { session, navigation } = setup();
    navigation.select(HOME);
    navigation.search(HOME, HOME_SEARCH, 'moo');
    const place = navigation.placeOf(HOME)!;
    session.keepSelection(place.id, new Set(['a']));
    session.keepScroll(place.id, 120);

    navigation.search(HOME, HOME_SEARCH, 'moon');

    expect(session.selectionOf(place.id).size).toBe(0);
    expect(session.scrollOf(place.id)).toBe(0);
  });

  it('goes back to the feed the search began on when it is left', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.search(HOME, HOME_SEARCH, 'moon');

    navigation.leaveSearch(HOME);

    expect(browser.calls.at(-1)).toBe('go -1');
    expect(crumbs(navigation)).toEqual(['Home', 'By Series']);
  });

  it('leaves a feed alone when there is no search to leave', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const calls = browser.calls.length;

    navigation.leaveSearch(HOME);

    expect(browser.calls).toHaveLength(calls);
  });
});

describe('createNavigation details', () => {
  it('opens details as one browser entry and closes them with Back', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const entries = browser.entries.length;

    navigation.openDetails('book-1');
    expect(navigation.detailsOf(HOME)).toBe('book-1');
    expect(browser.entries).toHaveLength(entries + 1);

    navigation.closeDetails();
    expect(navigation.detailsOf(HOME)).toBeNull();
    expect(browser.calls.at(-1)).toBe('back');
  });

  it('closes the details when the reader goes back by the browser', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.openDetails('book-1');

    browser.travel(-1);

    expect(navigation.detailsOf(HOME)).toBeNull();
  });

  it('goes back nowhere when no details are open', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const calls = browser.calls.length;

    navigation.closeDetails();

    expect(browser.calls).toHaveLength(calls);
  });

  it('opens the details of a device book on the device tab', () => {
    const { navigation } = setup();

    navigation.openDetails('book-9');

    expect(navigation.detailsOf('device')).toBe('book-9');
  });
});

describe('createNavigation tabs', () => {
  it('replaces the arrival entry for a tab switch so Back leaves the library', () => {
    const { browser, navigation } = setup();
    const entries = browser.entries.length;

    navigation.select(HOME);

    expect(browser.entries).toHaveLength(entries);
    expect(browser.at).toBe(0);
    expect(browser.calls.at(-1)).toBe('replace');
    expect(navigation.tab).toBe(HOME);
    expect(browser.state).toEqual({ tab: HOME, entryId: navigation.current.id });
  });

  it('selects nothing when the tab is already shown', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    const calls = browser.calls.length;

    navigation.select(HOME);

    expect(browser.calls).toHaveLength(calls);
  });

  it('reaches the root of a catalog by going back to the arrival entry', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.open(HOME, VOYAGE);
    const root = navigation.crumbs(HOME, 'Home')[0]!;

    navigation.goTo(root.place);

    expect(browser.at).toBe(0);
    expect(browser.calls.at(-1)).toBe('go -2');
  });

  it('returns to the place a tab was left at and still reaches its ancestors', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.select(ARCHIVE);
    navigation.select(HOME);
    const root = navigation.crumbs(HOME, 'Home')[0]!;

    expect(crumbs(navigation)).toEqual(['Home', 'By Series']);
    navigation.goTo(root.place);

    expect(browser.calls.at(-1)).toBe('go -1');
    expect(crumbs(navigation)).toEqual(['Home']);
  });

  it('keeps each tab its own crumbs', () => {
    const { navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.select(ARCHIVE);
    navigation.open(ARCHIVE, VOYAGE);

    expect(crumbs(navigation, HOME)).toEqual(['Home', 'By Series']);
    expect(crumbs(navigation, ARCHIVE)).toEqual(['Home', 'Star Voyage']);
  });

  it('pushes a browser entry, dropping what lay ahead, when the tab changes after Back', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    browser.travel(-1);

    navigation.select(ARCHIVE);

    expect(browser.calls.at(-1)).toBe('push');
    expect(browser.entries).toHaveLength(browser.at + 1);
    expect(crumbs(navigation, HOME)).toEqual(['Home']);
  });

  it('follows Back between tabs left by a replace', () => {
    const { browser, navigation } = setup();
    navigation.select(HOME);
    navigation.open(HOME, SERIES);
    navigation.select(ARCHIVE);

    browser.travel(-1);

    expect(navigation.tab).toBe(HOME);
    expect(crumbs(navigation)).toEqual(['Home']);
  });
});
