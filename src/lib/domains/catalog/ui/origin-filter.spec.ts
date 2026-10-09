import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { readReady } from '$lib/shared/read-state';
import type { BookOrigin } from '../domain/book-origin';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';
import { listedOrigins } from './catalog-list';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { createOriginFilter } from './origin-filter.svelte';
import {
  ALL_FILTER,
  badgeFor,
  filterOptions,
  matches,
  parsedFilter,
  shownFilter,
  sourceText,
} from './origin-filter';

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

function listing(catalogs: ListCatalogsResult, origins: ListOriginsResult) {
  return listedOrigins(readReady({ catalogs, origins }));
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
  it('lists All, Added from files, then one Downloaded from option per catalog', () => {
    expect(filterOptions([HOME, ARCHIVE]).map((option) => option.label)).toEqual([
      'All',
      'Added from files',
      'Downloaded from Home',
      'Downloaded from Archive',
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

describe('badgeFor', () => {
  it('names the catalog a downloaded book came from and nothing for a file', () => {
    const listed = listing(TWO, DOWNLOADS);

    expect(badgeFor(listed, FROM_HOME)).toBe('Home');
    expect(badgeFor(listed, FILE)).toBeNull();
  });

  it('ignores an origin whose catalog is gone', () => {
    const listed = listing({ kind: 'success', catalogs: [ARCHIVE], unreadable: [] }, DOWNLOADS);

    expect(badgeFor(listed, FROM_HOME)).toBeNull();
    expect(sourceText(badgeFor(listed, FROM_HOME))).toBe('Added from files');
  });

  it('words the source of a book as downloaded from its catalog or added from files', () => {
    expect(sourceText('Home')).toBe('Downloaded from Home');
    expect(sourceText(null)).toBe('Added from files');
  });
});

describe('matches', () => {
  const listed = listing(TWO, DOWNLOADS);

  it('keeps every book while the filter is All', () => {
    for (const id of [FILE, FROM_HOME, FROM_ARCHIVE]) {
      expect(matches(ALL_FILTER, listed, id)).toBe(true);
    }
  });

  it('keeps only the books added from files', () => {
    const files = { kind: 'files' } as const;

    expect(matches(files, listed, FILE)).toBe(true);
    expect(matches(files, listed, FROM_HOME)).toBe(false);
  });

  it('keeps only the books of the chosen catalog', () => {
    const home = { kind: 'catalog', catalogId: HOME.id } as const;

    expect(matches(home, listed, FROM_HOME)).toBe(true);
    expect(matches(home, listed, FROM_ARCHIVE)).toBe(false);
    expect(matches(home, listed, FILE)).toBe(false);
  });

  it('counts the book of a removed catalog as added from files', () => {
    const afterRemoval = listing(
      { kind: 'success', catalogs: [ARCHIVE], unreadable: [] },
      DOWNLOADS,
    );

    expect(matches({ kind: 'files' }, afterRemoval, FROM_HOME)).toBe(true);
  });

  it('shows all again when the chosen catalog is removed', () => {
    const afterRemoval = listing(
      { kind: 'success', catalogs: [ARCHIVE], unreadable: [] },
      DOWNLOADS,
    );

    expect(matches({ kind: 'catalog', catalogId: HOME.id }, afterRemoval, FILE)).toBe(true);
  });

  it('keeps every book while nothing could be listed', () => {
    const nothing = listing({ kind: 'storage-unavailable' }, { kind: 'storage-unavailable' });

    expect(matches(ALL_FILTER, nothing, FILE)).toBe(true);
  });
});

describe('createOriginFilter', () => {
  it('starts on All', () => {
    expect(createOriginFilter().chosen).toEqual({ kind: 'all' });
  });

  it('keeps the raw choice and hands it to the one that remembers it', () => {
    const kept: unknown[] = [];
    const filter = createOriginFilter(undefined, (chosen) => kept.push(chosen));
    const [, , home] = filterOptions([HOME]);

    filter.choose(home?.value ?? '', [HOME]);

    expect(filter.chosen).toEqual({ kind: 'catalog', catalogId: HOME.id });
    expect(kept).toEqual([{ kind: 'catalog', catalogId: HOME.id }]);
  });

  it('starts from a remembered choice', () => {
    const filter = createOriginFilter({ kind: 'files' });

    expect(filter.chosen).toEqual({ kind: 'files' });
  });
});
