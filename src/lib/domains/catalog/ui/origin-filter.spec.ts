import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookOrigin } from '../domain/book-origin';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';
import { CatalogSession } from './catalog-session.svelte';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { OriginFilterView } from './origin-filter.svelte';
import { filterOptions, parsedFilter, shownFilter } from './origin-filter';

function origin(book: string, owner: BookOrigin['catalogId']): BookOrigin {
  return {
    bookId: bookId(book),
    catalogId: owner,
    entryId: book,
    acquisition: { href: 'https://x.test/1', format: 'epub', mediaType: 'x', length: null },
    updated: '2026-10-01T00:00:00Z',
    feedPath: [],
    feedPosition: 0,
    downloadedAt: 1,
  };
}

function setup(catalogs: ListCatalogsResult, origins: ListOriginsResult) {
  const answers = { catalogs, origins };
  const session = new CatalogSession();
  const view = new OriginFilterView(session, {
    listCatalogs: () => Promise.resolve(answers.catalogs),
    listOrigins: () => Promise.resolve(answers.origins),
  });
  return { view, session, answers };
}

const TWO: ListCatalogsResult = { kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] };

const DOWNLOADS: ListOriginsResult = {
  kind: 'success',
  origins: [origin('from-home', HOME.id), origin('from-archive', ARCHIVE.id)],
  unreadable: [],
};

const FILE = bookId('from-file');
const FROM_HOME = bookId('from-home');
const FROM_ARCHIVE = bookId('from-archive');

describe('filterOptions', () => {
  it('lists All, Added from files, then one option per catalog by name', () => {
    expect(filterOptions([HOME, ARCHIVE]).map((option) => option.label)).toEqual([
      'All',
      'Added from files',
      'Home',
      'Archive',
    ]);
  });
});

describe('parsedFilter', () => {
  it('reads a catalog value back and falls back to all for an unknown one', () => {
    const [, , home] = filterOptions([HOME]);
    expect(parsedFilter(home?.value ?? '', [HOME])).toEqual({
      kind: 'catalog',
      catalogId: HOME.id,
    });
    expect(parsedFilter('catalog:gone', [HOME])).toEqual({ kind: 'all' });
  });
});

describe('shownFilter', () => {
  it('falls back to all when the chosen catalog no longer exists', () => {
    expect(shownFilter({ kind: 'catalog', catalogId: HOME.id }, [ARCHIVE])).toEqual({
      kind: 'all',
    });
  });
});

describe('OriginFilterView', () => {
  it('stays hidden while there are no catalogs', async () => {
    const { view } = setup({ kind: 'success', catalogs: [], unreadable: [] }, DOWNLOADS);
    await view.load();
    expect(view.visible).toBe(false);
  });

  it('stays hidden when nothing can be listed', async () => {
    const { view } = setup({ kind: 'storage-unavailable' }, { kind: 'storage-unavailable' });
    await view.load();
    expect(view.visible).toBe(false);
  });

  it('names the catalog a downloaded book came from and nothing for a file', async () => {
    const { view } = setup(TWO, DOWNLOADS);
    await view.load();
    expect(view.visible).toBe(true);
    expect(view.badgeFor(FROM_HOME)).toBe('Home');
    expect(view.badgeFor(FROM_ARCHIVE)).toBe('Archive');
    expect(view.badgeFor(FILE)).toBeNull();
  });

  it('keeps every book while the filter is All', async () => {
    const { view } = setup(TWO, DOWNLOADS);
    await view.load();
    expect([FILE, FROM_HOME, FROM_ARCHIVE].map((id) => view.matches(id))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('keeps only the books added from files', async () => {
    const { view } = setup(TWO, DOWNLOADS);
    await view.load();
    view.choose('files');
    expect(view.value).toBe('files');
    expect([FILE, FROM_HOME, FROM_ARCHIVE].map((id) => view.matches(id))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('keeps only the books of the chosen catalog', async () => {
    const { view } = setup(TWO, DOWNLOADS);
    await view.load();
    view.choose(filterOptions([HOME, ARCHIVE])[3]?.value ?? '');
    expect([FILE, FROM_HOME, FROM_ARCHIVE].map((id) => view.matches(id))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('ignores an origin whose catalog is gone and counts its book as added from files', async () => {
    const { view } = setup({ kind: 'success', catalogs: [HOME], unreadable: [] }, DOWNLOADS);
    await view.load();
    expect(view.badgeFor(FROM_ARCHIVE)).toBeNull();
    view.choose('files');
    expect(view.matches(FROM_ARCHIVE)).toBe(true);
    expect(view.matches(FROM_HOME)).toBe(false);
  });

  it('shows all again when the chosen catalog is removed', async () => {
    const { view, answers } = setup(TWO, DOWNLOADS);
    await view.load();
    view.choose(filterOptions([HOME, ARCHIVE])[3]?.value ?? '');
    answers.catalogs = { kind: 'success', catalogs: [HOME], unreadable: [] };
    await view.load();
    expect(view.value).toBe('all');
    expect(view.matches(FILE)).toBe(true);
  });

  it('picks up a new download after a refresh', async () => {
    const { view, answers } = setup(TWO, { kind: 'success', origins: [], unreadable: [] });
    await view.load();
    expect(view.badgeFor(FROM_HOME)).toBeNull();
    answers.origins = DOWNLOADS;
    await view.load();
    expect(view.badgeFor(FROM_HOME)).toBe('Home');
  });

  it('keeps the chosen filter across views of one session', async () => {
    const { view, session } = setup(TWO, DOWNLOADS);
    await view.load();
    view.choose('files');
    const next = new OriginFilterView(session, {
      listCatalogs: () => Promise.resolve(TWO),
      listOrigins: () => Promise.resolve(DOWNLOADS),
    });
    await next.load();
    expect(next.value).toBe('files');
  });
});
