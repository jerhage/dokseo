import { describe, expect, it } from 'vitest';
import {
  ROOT_POSITION,
  atDepth,
  crumbs,
  identified,
  opened,
  paged,
  searched,
  searchStep,
  searchUrl,
} from './feed-address';
import type { FeedPosition } from './feed-address';

const SERIES = { title: 'By Series', href: 'https://x.test/series' };
const ONE = { title: '星の旅', href: 'https://x.test/series/one' };

const DEEP: FeedPosition = {
  path: [SERIES, ONE],
  url: 'https://x.test/series/one?offset=30',
  ids: ['root', 'series', 'one'],
};

describe('searchUrl', () => {
  it('encodes the query into the template', () => {
    expect(searchUrl('https://x.test/search/{searchTerms}?lib=a', 'star & voyage')).toBe(
      'https://x.test/search/star%20%26%20voyage?lib=a',
    );
  });

  it('encodes a non-ASCII query', () => {
    expect(searchUrl('https://x.test/s/{searchTerms}', '星')).toBe('https://x.test/s/%E6%98%9F');
  });

  it('fills the placeholder wherever it appears', () => {
    expect(searchUrl('https://x.test/s?q={searchTerms}&t={searchTerms}', 'a b')).toBe(
      'https://x.test/s?q=a%20b&t=a%20b',
    );
  });
});

describe('searchStep', () => {
  it('names the step by the trimmed query', () => {
    expect(searchStep('https://x.test/s/{searchTerms}', '  moon ')).toEqual({
      title: 'Search: moon',
      href: 'https://x.test/s/moon',
    });
  });
});

describe('searched', () => {
  it('replaces the path with the search step alone', () => {
    const step = { title: 'Search: moon', href: 'https://x.test/s/moon' };
    expect(searched(DEEP, step)).toEqual({ path: [step], url: step.href, ids: ['root', ''] });
  });
});

describe('positions', () => {
  it('opens a step by appending it and showing its feed', () => {
    expect(opened(ROOT_POSITION, SERIES)).toEqual({
      path: [SERIES],
      url: SERIES.href,
      ids: ['', ''],
    });
  });

  it('pages without changing the path', () => {
    expect(paged(DEEP, 'https://x.test/p3')).toEqual({
      path: [SERIES, ONE],
      url: 'https://x.test/p3',
      ids: ['root', 'series', 'one'],
    });
  });

  it('goes back to the feed of an earlier step', () => {
    expect(atDepth(DEEP, 1)).toEqual({ path: [SERIES], url: SERIES.href, ids: ['root', 'series'] });
  });

  it('goes back to the root at depth 0', () => {
    expect(atDepth(DEEP, 0)).toEqual({ path: [], url: null, ids: ['root'] });
  });

  it('keeps the whole path at its own depth, on its first page', () => {
    expect(atDepth(DEEP, 2)).toEqual({
      path: [SERIES, ONE],
      url: ONE.href,
      ids: ['root', 'series', 'one'],
    });
  });
});

describe('identified', () => {
  const OPENED: FeedPosition = {
    path: [SERIES],
    url: 'https://x.test/opds?library_id=calibre',
    ids: ['root', ''],
  };

  it('records the id of a feed it has not seen', () => {
    expect(identified(OPENED, 'series')).toEqual({ ...OPENED, ids: ['root', 'series'] });
  });

  it('truncates to the root when the loaded feed is the root again', () => {
    expect(identified(OPENED, 'root')).toEqual({
      path: [],
      url: 'https://x.test/opds?library_id=calibre',
      ids: ['root'],
    });
  });

  it('truncates to an earlier step and points it at the new address', () => {
    const position: FeedPosition = {
      path: [SERIES, ONE],
      url: 'https://x.test/series?again',
      ids: ['root', 'series', ''],
    };
    expect(identified(position, 'series')).toEqual({
      path: [{ title: SERIES.title, href: 'https://x.test/series?again' }],
      url: 'https://x.test/series?again',
      ids: ['root', 'series'],
    });
  });

  it('never matches an empty id', () => {
    const position: FeedPosition = { path: [SERIES], url: SERIES.href, ids: ['', ''] };
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
