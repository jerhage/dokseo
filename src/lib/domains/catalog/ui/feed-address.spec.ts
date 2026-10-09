import { describe, expect, it } from 'vitest';
import {
  ROOT_POSITION,
  addressed,
  atDepth,
  crumbs,
  identified,
  locationOf,
  opened,
  readingKey,
  samePosition,
  searched,
  searchStep,
  settled,
} from './feed-address';
import { feedAddress } from '../domain/catalog-feed-fixtures';
import type { FeedPosition } from './feed-address';

const SERIES = { title: 'By Series', address: feedAddress('https://x.test/series') };
const ONE = { title: '星の旅', address: feedAddress('https://x.test/series/one') };

const DEEP: FeedPosition = {
  path: [SERIES, ONE],
  address: feedAddress('https://x.test/series/one?offset=30'),
  ids: ['root', 'series', 'one'],
  lookup: null,
};

describe('searchStep', () => {
  it('names the step by the trimmed query and leaves its address for the result', () => {
    expect(searchStep('  moon ')).toEqual({ title: 'Search: moon', address: null });
  });
});

describe('searched', () => {
  it('replaces the path with the search step alone and keeps the lookup', () => {
    const lookup = { search: { handle: 'h' }, query: 'moon' };
    expect(searched(DEEP, lookup)).toEqual({
      path: [{ title: 'Search: moon', address: null }],
      address: null,
      ids: ['root', ''],
      lookup,
    });
  });
});

describe('addressed', () => {
  it('points the last step and the position at the address a search was read from', () => {
    const lookup = { search: { handle: 'h' }, query: 'moon' };
    expect(addressed(searched(DEEP, lookup), feedAddress('https://x.test/s/moon'))).toEqual({
      path: [{ title: 'Search: moon', address: feedAddress('https://x.test/s/moon') }],
      address: feedAddress('https://x.test/s/moon'),
      ids: ['root', ''],
      lookup: null,
    });
  });
});

describe('positions', () => {
  it('opens a step by appending it and showing its feed', () => {
    expect(opened(ROOT_POSITION, SERIES)).toEqual({
      path: [SERIES],
      address: SERIES.address,
      ids: ['', ''],
      lookup: null,
    });
  });

  it('goes back to the feed of an earlier step', () => {
    expect(atDepth(DEEP, 1)).toEqual({
      path: [SERIES],
      address: SERIES.address,
      ids: ['root', 'series'],
      lookup: null,
    });
  });

  it('goes back to the root at depth 0', () => {
    expect(atDepth(DEEP, 0)).toEqual({ path: [], address: null, ids: ['root'], lookup: null });
  });

  it('keeps the whole path at its own depth, on its first page', () => {
    expect(atDepth(DEEP, 2)).toEqual({
      path: [SERIES, ONE],
      address: ONE.address,
      ids: ['root', 'series', 'one'],
      lookup: null,
    });
  });
});

describe('identified', () => {
  const OPENED: FeedPosition = {
    path: [SERIES],
    address: feedAddress('https://x.test/opds?library_id=calibre'),
    ids: ['root', ''],
    lookup: null,
  };

  it('records the id of a feed it has not seen', () => {
    expect(identified(OPENED, 'series')).toEqual({ ...OPENED, ids: ['root', 'series'] });
  });

  it('truncates to the root when the loaded feed is the root again', () => {
    expect(identified(OPENED, 'root')).toEqual({
      path: [],
      address: feedAddress('https://x.test/opds?library_id=calibre'),
      ids: ['root'],
      lookup: null,
    });
  });

  it('truncates to an earlier step and points it at the new address', () => {
    const position: FeedPosition = {
      path: [SERIES, ONE],
      address: feedAddress('https://x.test/series?again'),
      ids: ['root', 'series', ''],
      lookup: null,
    };
    expect(identified(position, 'series')).toEqual({
      path: [{ title: SERIES.title, address: feedAddress('https://x.test/series?again') }],
      address: feedAddress('https://x.test/series?again'),
      ids: ['root', 'series'],
      lookup: null,
    });
  });

  it('never matches an empty id', () => {
    const position: FeedPosition = {
      path: [SERIES],
      address: SERIES.address,
      ids: ['', ''],
      lookup: null,
    };
    expect(identified(position, '')).toEqual(position);
  });
});

describe('crumbs', () => {
  it('starts at the catalog name and adds one crumb per step', () => {
    expect(crumbs('Home', [SERIES, ONE]).map((crumb) => crumb.label)).toEqual([
      'Home',
      'By Series',
      '星の旅',
    ]);
  });

  it('gives each crumb the depth it returns to', () => {
    expect(crumbs('Home', [SERIES, ONE]).map((crumb) => crumb.depth)).toEqual([0, 1, 2]);
  });
});

describe('settled', () => {
  const LOOKUP = { search: { handle: 'h' }, query: 'moon' };

  it('records the id of a plain feed it has not seen', () => {
    const position: FeedPosition = {
      path: [SERIES],
      address: SERIES.address,
      ids: ['root', ''],
      lookup: null,
    };

    expect(settled(position, { address: SERIES.address, id: 'series' }).ids).toEqual([
      'root',
      'series',
    ]);
  });

  it('points a search at the address its result was read from', () => {
    const result = feedAddress('https://x.test/s/moon');

    expect(settled(searched(DEEP, LOOKUP), { address: result, id: 'results' })).toEqual({
      path: [{ title: 'Search: moon', address: result }],
      address: result,
      ids: ['root', 'results'],
      lookup: null,
    });
  });
});

describe('locationOf', () => {
  it('names the root when no feed address and no search is held', () => {
    expect(locationOf(ROOT_POSITION)).toEqual({ kind: 'root' });
  });

  it('names a feed by its address', () => {
    expect(locationOf(DEEP)).toEqual({ kind: 'address', address: DEEP.address });
  });

  it('names a search by its lookup before the result settles', () => {
    const lookup = { search: { handle: 'h' }, query: 'moon' };

    expect(locationOf(searched(DEEP, lookup))).toEqual({ kind: 'search', ...lookup });
  });
});

describe('readingKey', () => {
  it('differs for two locations and repeats for the same one', () => {
    const root = readingKey({ kind: 'root' });
    const series = readingKey({ kind: 'address', address: SERIES.address });

    expect(root).not.toBe(series);
    expect(series).toBe(
      readingKey({ kind: 'address', address: feedAddress(SERIES.address.handle) }),
    );
  });
});

describe('samePosition', () => {
  it('holds for a position and a copy that differs only in identity', () => {
    expect(samePosition(DEEP, { ...DEEP, path: [...DEEP.path], ids: [...DEEP.ids] })).toBe(true);
  });

  it('differs when an address, an id or a step differs', () => {
    expect(samePosition(DEEP, { ...DEEP, address: SERIES.address })).toBe(false);
    expect(samePosition(DEEP, { ...DEEP, ids: ['root', 'series', ''] })).toBe(false);
    expect(samePosition(DEEP, { ...DEEP, path: [SERIES] })).toBe(false);
    expect(
      samePosition(DEEP, { ...DEEP, path: [SERIES, { title: 'other', address: ONE.address }] }),
    ).toBe(false);
  });
});
