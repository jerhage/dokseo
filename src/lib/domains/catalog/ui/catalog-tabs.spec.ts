import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import { CatalogSession } from './catalog-session.svelte';
import { CatalogTabsView } from './catalog-tabs.svelte';
import type { CatalogTabsUseCases } from './catalog-tabs.svelte';
import { ARCHIVE, HOME, publication } from './catalog-ui-fixtures';
import { DEVICE_TAB, catalogTabs } from './library-tabs';

function setup(list: ListCatalogsResult) {
  const notices: Notice[] = [];
  const opened: string[] = [];
  const refreshed: number[] = [];
  const cases: CatalogTabsUseCases = {
    listCatalogs: () => Promise.resolve(list),
    browseCatalog: () => Promise.resolve({ kind: 'offline' }),
    unlockCatalog: () => ({ kind: 'success' }),
    readCatalogCover: () => Promise.resolve({ kind: 'not-found' }),
    updatePublication: () => Promise.resolve({ kind: 'aborted' }),
    downloadPublication: () => Promise.resolve({ kind: 'success', bookId: bookId('new') }),
  };
  const session = new CatalogSession();
  const view = new CatalogTabsView(session, {
    cases,
    notify: (notice) => notices.push(notice),
    matching: () => DEFAULT_BOOK_MATCHING,
    defaults: () => INITIAL_READING_DEFAULTS,
    describeOpenFile: () => '',
    openBook: (id) => opened.push(id),
    refreshLibrary: () => {
      refreshed.push(1);
      return Promise.resolve();
    },
  });
  return { view, session, notices, opened, refreshed };
}

const TWO: ListCatalogsResult = { kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] };

describe('catalogTabs', () => {
  it('puts On this device first and one tab per catalog by its name', () => {
    expect(catalogTabs([HOME, ARCHIVE])).toEqual([
      { id: DEVICE_TAB, label: 'On this device' },
      { id: HOME.id, label: 'Home' },
      { id: ARCHIVE.id, label: 'Archive' },
    ]);
  });
});

describe('CatalogTabsView', () => {
  it('shows no tabs while there are no catalogs', async () => {
    const { view } = setup({ kind: 'success', catalogs: [], unreadable: [] });
    await view.load();
    expect(view.visible).toBe(false);
  });

  it('shows no tabs when the catalogs cannot be listed', async () => {
    const { view } = setup({ kind: 'storage-unavailable' });
    await view.load();
    expect(view.visible).toBe(false);
  });

  it('shows the tabs once a catalog exists', async () => {
    const { view } = setup(TWO);
    await view.load();
    expect(view.visible).toBe(true);
    expect(view.tabs).toHaveLength(3);
  });

  it('starts on the device tab', async () => {
    const { view } = setup(TWO);
    await view.load();
    expect(view.selected).toBe(DEVICE_TAB);
  });

  it('keeps the chosen tab in the session', async () => {
    const { view, session } = setup(TWO);
    await view.load();
    view.select(HOME.id);
    expect(session.selected).toBe(HOME.id);
    expect(view.selected).toBe(HOME.id);
  });

  it('counts a tab as shown only once it has been selected', async () => {
    const { view } = setup(TWO);
    await view.load();
    expect(view.hasBeenShown(DEVICE_TAB)).toBe(true);
    expect(view.hasBeenShown(HOME.id)).toBe(false);
    view.select(HOME.id);
    expect(view.hasBeenShown(HOME.id)).toBe(true);
    view.select(ARCHIVE.id);
    expect(view.hasBeenShown(HOME.id)).toBe(true);
    view.select(DEVICE_TAB);
    expect(view.hasBeenShown(ARCHIVE.id)).toBe(true);
  });

  it('falls back to the device tab when the chosen catalog is gone', async () => {
    const { view, session } = setup({ kind: 'success', catalogs: [ARCHIVE], unreadable: [] });
    session.selected = HOME.id;
    await view.load();
    expect(view.selected).toBe(DEVICE_TAB);
  });

  it('gives each catalog one browse view that lasts', async () => {
    const { view } = setup(TWO);
    await view.load();
    expect(view.browsing(HOME)).toBe(view.browsing(HOME));
    expect(view.browsing(HOME)).not.toBe(view.browsing(ARCHIVE));
  });

  it('finds the catalog behind a tab id', async () => {
    const { view } = setup(TWO);
    await view.load();
    expect(view.catalogFor(ARCHIVE.id)).toBe(ARCHIVE);
    expect(view.catalogFor(DEVICE_TAB)).toBeNull();
  });

  it('announces a finished download with an Open action and refreshes the library', async () => {
    const { view, notices, opened, refreshed } = setup(TWO);
    await view.load();
    await view.browsing(HOME).downloads.start(publication('a', { title: 'Star Voyage' }), 0);
    expect(notices[0]).toMatchObject({
      tone: 'success',
      title: 'Added Star Voyage',
      action: { label: 'Open' },
    });
    notices[0]?.action?.run();
    expect(opened).toEqual(['new']);
    expect(refreshed).toHaveLength(1);
  });
});
