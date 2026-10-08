import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import { CALIBRE_ROOT } from '../domain/opds-fixtures';
import { readOpdsFeed } from '../domain/opds-feed';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import { CatalogHeaderSearch } from './catalog-header-search.svelte';
import { CatalogSession } from './catalog-session.svelte';
import { CatalogTabsView } from './catalog-tabs.svelte';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { DEVICE_TAB } from './library-tabs';
import { searchAvailability, searchPlaceholder } from './catalog-search';

const WITHOUT_SEARCH = CALIBRE_ROOT.replace(/<link title="Search"[^>]*\/>/u, '');

function setup() {
  const urls: Array<string | null> = [];
  const session = new CatalogSession();
  const tabs = new CatalogTabsView(session, {
    cases: {
      listCatalogs: () =>
        Promise.resolve({ kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] }),
      browseCatalog: (id, url, path) => {
        urls.push(url);
        const xml = id === HOME.id ? CALIBRE_ROOT : WITHOUT_SEARCH;
        const own = url === null ? xml : xml.replace('urn:calibre:main', 'urn:calibre:results');
        const reading = readOpdsFeed(own, url ?? 'https://home.test/opds', id, path);
        if (reading.kind === 'not-a-feed') throw new Error('fixture is not a feed');
        const answer: BrowseCatalogResult = { kind: 'success', reading, held: new Map() };
        return Promise.resolve(answer);
      },
      unlockCatalog: () => ({ kind: 'success' }),
      readCatalogCover: () => Promise.resolve({ kind: 'not-found' }),
      downloadPublication: () => Promise.resolve({ kind: 'success', bookId: bookId('new') }),
    },
    notify: () => undefined,
    matching: () => DEFAULT_BOOK_MATCHING,
    defaults: () => INITIAL_READING_DEFAULTS,
    describeOpenFile: () => '',
    openBook: () => undefined,
    refreshLibrary: () => Promise.resolve(),
  });
  return { search: new CatalogHeaderSearch(tabs, session), tabs, urls };
}

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
    expect(searchAvailability(true, '/s/{searchTerms}')).toBe('offered');
  });
});

describe('CatalogHeaderSearch', () => {
  it('offers no field while the device tab is selected', async () => {
    const { search, tabs } = setup();
    await tabs.load();
    expect(tabs.selected).toBe(DEVICE_TAB);
    expect(search.field).toBeUndefined();
  });

  it('names the selected catalog in the placeholder', async () => {
    const { search, tabs } = setup();
    await tabs.load();
    tabs.select(HOME.id);
    expect(search.field).toMatchObject({ placeholder: 'Search Home', disabled: false });
  });

  it('keeps each catalog its own query', async () => {
    const { search, tabs } = setup();
    await tabs.load();
    tabs.select(HOME.id);
    search.field?.oninput('moon');
    tabs.select(ARCHIVE.id);
    expect(search.field?.value).toBe('');
    search.field?.oninput('sun');
    tabs.select(HOME.id);
    expect(search.field?.value).toBe('moon');
  });

  it('searches the selected catalog on submit', async () => {
    const { search, tabs, urls } = setup();
    await tabs.load();
    tabs.select(HOME.id);
    await tabs.browsing(HOME).start();
    search.field?.onsubmit('moon');
    await Promise.resolve();
    expect(urls.at(-1)).toContain('/opds/search/moon');
    expect(tabs.browsing(HOME).crumbs.at(-1)?.label).toBe('Search: moon');
  });

  it('disables the field for a catalog whose feeds offer no search', async () => {
    const { search, tabs } = setup();
    await tabs.load();
    tabs.select(ARCHIVE.id);
    await tabs.browsing(ARCHIVE).start();
    expect(search.field).toMatchObject({ placeholder: 'Archive has no search', disabled: true });
  });

  it('keeps the field enabled while the feed is still being read', async () => {
    const { search, tabs } = setup();
    await tabs.load();
    tabs.select(ARCHIVE.id);
    expect(search.field).toMatchObject({ placeholder: 'Search Archive', disabled: false });
  });
});
