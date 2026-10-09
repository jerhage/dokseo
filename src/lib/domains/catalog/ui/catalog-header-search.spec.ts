import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { readReady } from '$lib/shared/read-state';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { HOME_ROOT_FEED, HOME_SEARCH, withoutSearch } from '../domain/catalog-feed-fixtures';
import type { Catalog } from '../domain/catalog';
import { CatalogHeaderSearch, SEARCH_DEBOUNCE_MS } from './catalog-header-search.svelte';
import type { SearchClock } from './catalog-header-search.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { CatalogTabsView } from './catalog-tabs.svelte';
import { ARCHIVE, HOME, readyRead } from './catalog-ui-fixtures';
import { DEVICE_TAB } from './library-tabs';
import { searchAvailability, searchFieldKey, searchPlaceholder } from './catalog-search';

class ManualClock implements SearchClock {
  now = 0;
  #timers = new Map<number, { at: number; run: () => void }>();
  #next = 0;

  after = (ms: number, run: () => void): (() => void) => {
    const id = this.#next++;
    this.#timers.set(id, { at: this.now + ms, run });
    return () => void this.#timers.delete(id);
  };

  advance(ms: number): void {
    this.now += ms;
    for (const [id, timer] of this.#timers) {
      if (timer.at > this.now) continue;
      this.#timers.delete(id);
      timer.run();
    }
  }
}

function setup() {
  const clock = new ManualClock();
  const pushes: string[] = [];
  const session = new CatalogSession();
  const tabs = new CatalogTabsView(session, {
    catalogs: () => readReady({ kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] }),
    cases: {
      browseCatalog: () => Promise.resolve({ kind: 'offline' }),
      searchCatalog: () => Promise.resolve({ kind: 'offline' }),
      heldOrigins: () => Promise.resolve({ kind: 'success', held: new Map() }),
      forgetDanglingOrigins: () => Promise.resolve({ kind: 'success', forgotten: 0 }),
      unlockCatalog: () => ({ kind: 'success' }),
      readCatalogCover: () => Promise.resolve({ kind: 'not-found' }),
      updatePublication: () => Promise.resolve({ kind: 'aborted' }),
      downloadPublication: () => Promise.resolve({ kind: 'success', bookId: bookId('new') }),
    },
    notify: () => undefined,
    matching: () => DEFAULT_BOOK_MATCHING,
    defaults: () => INITIAL_READING_DEFAULTS,
    describeOpenFile: () => '',
    openBook: () => undefined,
    refreshLibrary: () => Promise.resolve(),
    refreshOrigins: () => Promise.resolve(),
    history: {
      moved: (_tab, mode) => {
        if (mode === 'push') pushes.push(mode);
      },
      detailOpened: () => undefined,
      detailClosed: () => undefined,
      walkedBack: () => false,
    },
  });
  return { search: new CatalogHeaderSearch(tabs, session, clock), tabs, pushes, clock };
}

function loaded(tabs: CatalogTabsView, catalog: Catalog): void {
  const page = catalog.id === HOME.id ? HOME_ROOT_FEED : withoutSearch(HOME_ROOT_FEED);
  const view = tabs.browsing(catalog);
  view.bindFeed(() => readyRead(page));
  view.headLoaded(page);
}

function readingOf(tabs: CatalogTabsView, catalog: Catalog) {
  return tabs.browsing(catalog).reading;
}

const MOON = { kind: 'search', search: HOME_SEARCH, query: 'moon' } as const;

describe('searchPlaceholder', () => {
  it('names the catalog, and says when it has no search', () => {
    expect(searchPlaceholder('Calibre', 'offered')).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', 'unknown')).toBe('Search Calibre');
    expect(searchPlaceholder('Calibre', 'absent')).toBe('Calibre has no search');
  });
});

describe('searchAvailability', () => {
  it('reports absent only once the feed is read and offers no template', () => {
    expect(searchAvailability(false, null)).toBe('unknown');
    expect(searchAvailability(true, null)).toBe('absent');
    expect(searchAvailability(true, HOME_SEARCH)).toBe('offered');
  });
});

describe('CatalogHeaderSearch', () => {
  it('offers no field while the device tab is selected', async () => {
    const { search, tabs } = setup();
    expect(tabs.selected).toBe(DEVICE_TAB);
    expect(search.field).toBeUndefined();
  });

  it('names the selected catalog in the placeholder', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);
    expect(search.field).toMatchObject({ placeholder: 'Search Home', disabled: false });
  });

  it('keeps each catalog its own query', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);
    search.field?.oninput('moon');
    tabs.select(ARCHIVE.id);
    expect(search.field?.value).toBe('');
    search.field?.oninput('sun');
    tabs.select(HOME.id);
    expect(search.field?.value).toBe('moon');
  });

  it('searches the selected catalog on submit', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);
    loaded(tabs, HOME);
    search.field?.onsubmit('moon');
    expect(readingOf(tabs, HOME)).toEqual(MOON);
    expect(tabs.browsing(HOME).crumbs.at(-1)?.label).toBe('Search: moon');
  });

  it('disables the field for a catalog whose feeds offer no search', async () => {
    const { search, tabs } = setup();
    tabs.select(ARCHIVE.id);
    loaded(tabs, ARCHIVE);
    expect(search.field).toMatchObject({ placeholder: 'Archive has no search', disabled: true });
  });

  it('keeps the field enabled while the feed is still being read', async () => {
    const { search, tabs } = setup();
    tabs.select(ARCHIVE.id);
    expect(search.field).toMatchObject({ placeholder: 'Search Archive', disabled: false });
  });
});

describe('CatalogHeaderSearch.fieldFor', () => {
  it('answers the field of a catalog that is not the selected tab', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);

    expect(search.fieldFor(ARCHIVE)).toMatchObject({ placeholder: 'Search Archive' });
  });

  it('shares the query with the header field of the same catalog', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);

    search.fieldFor(HOME).oninput('lantern');

    expect(search.field?.value).toBe('lantern');
    expect(search.fieldFor(ARCHIVE).value).toBe('');
  });

  it('searches the catalog it was asked for, on submit', async () => {
    const { search, tabs } = setup();
    tabs.select(HOME.id);
    loaded(tabs, HOME);

    search.fieldFor(HOME).onsubmit('lantern');

    expect(readingOf(tabs, HOME)).toMatchObject({ kind: 'search', query: 'lantern' });
  });

  it('disables the field of a catalog whose feed offers no search once it is read', async () => {
    const { search, tabs } = setup();
    loaded(tabs, ARCHIVE);

    expect(search.fieldFor(ARCHIVE)).toMatchObject({
      disabled: true,
      placeholder: 'Archive has no search',
    });
  });
});

describe('CatalogHeaderSearch typing', () => {
  function ready() {
    const made = setup();
    made.tabs.select(HOME.id);
    loaded(made.tabs, HOME);
    return made;
  }

  it('sends one search after rapid typing pauses', () => {
    const { search, tabs, pushes, clock } = ready();
    for (const typed of ['m', 'mo', 'moo', 'moon']) {
      search.field?.oninput(typed);
      clock.advance(SEARCH_DEBOUNCE_MS - 100);
    }
    expect(readingOf(tabs, HOME)).toEqual({ kind: 'root' });
    clock.advance(100);
    expect(readingOf(tabs, HOME)).toEqual(MOON);
    expect(pushes).toHaveLength(1);
  });

  it('searches at once on Enter and drops the pending timer', () => {
    const { search, tabs, pushes, clock } = ready();
    search.field?.oninput('moon');
    search.field?.onsubmit('moon');
    expect(readingOf(tabs, HOME)).toEqual(MOON);
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(pushes).toHaveLength(1);
  });

  it('sends no search when the tab changed before the pause ended', () => {
    const { search, tabs, clock } = ready();
    search.field?.oninput('moon');
    tabs.select(ARCHIVE.id);
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(readingOf(tabs, HOME)).toEqual({ kind: 'root' });
  });

  it('sends no search once disposed', () => {
    const { search, tabs, clock } = ready();
    search.field?.oninput('moon');
    search.dispose();
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(readingOf(tabs, HOME)).toEqual({ kind: 'root' });
  });

  it('returns to the feed the search began on when the field empties', () => {
    const { search, tabs, clock } = ready();
    search.field?.oninput('moon');
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(readingOf(tabs, HOME)).toEqual(MOON);
    search.field?.oninput('');
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(readingOf(tabs, HOME)).toEqual({ kind: 'root' });
  });

  it('changes nothing when the field empties and no search is shown', () => {
    const { search, tabs, pushes, clock } = ready();
    search.field?.oninput('');
    clock.advance(SEARCH_DEBOUNCE_MS);
    expect(readingOf(tabs, HOME)).toEqual({ kind: 'root' });
    expect(pushes).toEqual([]);
  });
});

describe('searchFieldKey', () => {
  const press = (key: string, composing = false) => ({
    key,
    isComposing: composing,
    keyCode: composing ? 229 : 0,
  });

  it('submits on Enter', () => {
    expect(searchFieldKey(press('Enter'), 'lantern')).toBe('submit');
  });

  it('clears on Escape while the field holds text', () => {
    expect(searchFieldKey(press('Escape'), 'lantern')).toBe('clear');
  });

  it('ignores Escape on an empty field and any other key', () => {
    expect(searchFieldKey(press('Escape'), '')).toBe('ignore');
    expect(searchFieldKey(press('a'), 'lantern')).toBe('ignore');
  });

  it('ignores Enter while an input method is composing', () => {
    expect(searchFieldKey(press('Enter', true), 'ランタン')).toBe('ignore');
  });
});
