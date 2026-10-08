import { describe, expect, it } from 'vitest';
import {
  ROOT_POSITION,
  addressed,
  atDepth,
  crumbs,
  identified,
  opened,
  paged,
  searched,
  searchStep,
} from './feed-address';
import type { FeedPosition } from './feed-address';

const SERIES = { title: 'By Series', href: 'https://x.test/series' };
const ONE = { title: '星の旅', href: 'https://x.test/series/one' };

const DEEP: FeedPosition = {
  path: [SERIES, ONE],
  url: 'https://x.test/series/one?offset=30',
  ids: ['root', 'series', 'one'],
  lookup: null,
};

describe('searchStep', () => {
  it('names the step by the trimmed query and leaves its address for the result', () => {
    expect(searchStep('  moon ')).toEqual({ title: 'Search: moon', href: '' });
  });
});

describe('searched', () => {
  it('replaces the path with the search step alone and keeps the lookup', () => {
    const lookup = { search: { handle: 'h' }, query: 'moon' };
    expect(searched(DEEP, lookup)).toEqual({
      path: [{ title: 'Search: moon', href: '' }],
      url: null,
      ids: ['root', ''],
      lookup,
    });
  });
});

describe('addressed', () => {
  it('points the last step and the position at the address a search was read from', () => {
    const lookup = { search: { handle: 'h' }, query: 'moon' };
    expect(addressed(searched(DEEP, lookup), 'https://x.test/s/moon')).toEqual({
      path: [{ title: 'Search: moon', href: 'https://x.test/s/moon' }],
      url: 'https://x.test/s/moon',
      ids: ['root', ''],
      lookup: null,
    });
  });
});

describe('positions', () => {
  it('opens a step by appending it and showing its feed', () => {
    expect(opened(ROOT_POSITION, SERIES)).toEqual({
      path: [SERIES],
      url: SERIES.href,
      ids: ['', ''],
      lookup: null,
    });
  });

  it('pages without changing the path', () => {
    expect(paged(DEEP, 'https://x.test/p3')).toEqual({
      path: [SERIES, ONE],
      url: 'https://x.test/p3',
      ids: ['root', 'series', 'one'],
      lookup: null,
    });
  });

  it('goes back to the feed of an earlier step', () => {
    expect(atDepth(DEEP, 1)).toEqual({
      path: [SERIES],
      url: SERIES.href,
      ids: ['root', 'series'],
      lookup: null,
    });
  });

  it('goes back to the root at depth 0', () => {
    expect(atDepth(DEEP, 0)).toEqual({ path: [], url: null, ids: ['root'], lookup: null });
  });

  it('keeps the whole path at its own depth, on its first page', () => {
    expect(atDepth(DEEP, 2)).toEqual({
      path: [SERIES, ONE],
      url: ONE.href,
      ids: ['root', 'series', 'one'],
      lookup: null,
    });
  });
});

describe('identified', () => {
  const OPENED: FeedPosition = {
    path: [SERIES],
    url: 'https://x.test/opds?library_id=calibre',
    ids: ['root', ''],
    lookup: null,
  };

  it('records the id of a feed it has not seen', () => {
    expect(identified(OPENED, 'series')).toEqual({ ...OPENED, ids: ['root', 'series'] });
  });

  it('truncates to the root when the loaded feed is the root again', () => {
    expect(identified(OPENED, 'root')).toEqual({
      path: [],
      url: 'https://x.test/opds?library_id=calibre',
      ids: ['root'],
      lookup: null,
    });
  });

  it('truncates to an earlier step and points it at the new address', () => {
    const position: FeedPosition = {
      path: [SERIES, ONE],
      url: 'https://x.test/series?again',
      ids: ['root', 'series', ''],
      lookup: null,
    };
    expect(identified(position, 'series')).toEqual({
      path: [{ title: SERIES.title, href: 'https://x.test/series?again' }],
      url: 'https://x.test/series?again',
      ids: ['root', 'series'],
      lookup: null,
    });
  });

  it('never matches an empty id', () => {
    const position: FeedPosition = {
      path: [SERIES],
      url: SERIES.href,
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
