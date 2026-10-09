import { describe, expect, it } from 'vitest';
import { HOME_SEARCH, feedAddress } from '../domain/catalog-feed-fixtures';
import type { NavigationLink } from '../domain/catalog-feed';
import {
  crumbsOf,
  detailsOf,
  feedLocationOf,
  hasTab,
  identified,
  locationOfLink,
  moved,
  pathOf,
  placeOfTab,
  pushedDetails,
  pushedPlace,
  replacedLocation,
  sameFeedAncestor,
  started,
  stepsBack,
  switched,
} from './navigation';
import type { Navigation } from './navigation';

function counter() {
  let n = 0;
  return () => `i${++n}`;
}

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

function labels(navigation: Navigation, tab: string): string[] {
  return crumbsOf(navigation, tab, 'Home').map((crumb) => crumb.label);
}

function deep(newId = counter()): Navigation {
  const root = started('home', newId);
  const series = pushedPlace(root, 'home', locationOfLink(SERIES), newId);
  return pushedPlace(series, 'home', locationOfLink(VOYAGE), newId);
}

describe('started', () => {
  it('holds one root place and one entry for the tab', () => {
    const navigation = started('home', counter());

    expect(navigation.before).toEqual([]);
    expect(navigation.after).toEqual([]);
    expect(navigation.current).toMatchObject({ kind: 'location', tab: 'home' });
    expect(placeOfTab(navigation, 'home')?.location).toEqual({ kind: 'root' });
    expect(hasTab(navigation, 'home')).toBe(true);
    expect(hasTab(navigation, 'other')).toBe(false);
  });
});

describe('crumbsOf', () => {
  it('lists the places from the root to the current one', () => {
    expect(labels(deep(), 'home')).toEqual(['Home', 'By Series', 'Star Voyage']);
  });

  it('ends with a search placed on top of the feed it began on', () => {
    const newId = counter();
    const search = pushedPlace(
      deep(newId),
      'home',
      { kind: 'search', search: HOME_SEARCH, query: ' moon ' },
      newId,
    );

    expect(labels(search, 'home')).toEqual(['Home', 'By Series', 'Star Voyage', 'Search: moon']);
  });

  it('answers nothing for a tab that was never visited', () => {
    expect(labels(deep(), 'other')).toEqual([]);
  });
});

describe('pathOf', () => {
  it('lists the feed steps under the root with their addresses', () => {
    const navigation = deep();
    const place = placeOfTab(navigation, 'home');

    expect(pathOf(navigation, place?.id ?? '')).toEqual([
      { title: 'By Series', address: SERIES.address },
      { title: 'Star Voyage', address: VOYAGE.address },
    ]);
  });

  it('lists the search step alone for a search', () => {
    const newId = counter();
    const search = pushedPlace(
      deep(newId),
      'home',
      { kind: 'search', search: HOME_SEARCH, query: 'moon' },
      newId,
    );
    const place = placeOfTab(search, 'home');

    expect(pathOf(search, place?.id ?? '')).toEqual([{ title: 'Search: moon', address: null }]);
  });
});

describe('feedLocationOf', () => {
  it('names the root, an address and a search for the query', () => {
    const newId = counter();
    const root = started('home', newId);
    const feed = pushedPlace(root, 'home', locationOfLink(SERIES), newId);
    const search = pushedPlace(
      feed,
      'home',
      { kind: 'search', search: HOME_SEARCH, query: 'moon' },
      newId,
    );

    expect(feedLocationOf(placeOfTab(root, 'home')!)).toEqual({ kind: 'root' });
    expect(feedLocationOf(placeOfTab(feed, 'home')!)).toEqual({
      kind: 'address',
      address: SERIES.address,
    });
    expect(feedLocationOf(placeOfTab(search, 'home')!)).toEqual({
      kind: 'search',
      search: HOME_SEARCH,
      query: 'moon',
    });
  });
});

describe('stepsBack', () => {
  it('counts the entries between the current one and the nearest earlier visit', () => {
    const navigation = deep();
    const places = [...navigation.places.values()];
    const root = places.find((place) => place.parent === null);

    expect(stepsBack(navigation, root?.id ?? '')).toBe(2);
  });

  it('finds nothing for the current place or a place never visited', () => {
    const navigation = deep();
    const current = placeOfTab(navigation, 'home');

    expect(stepsBack(navigation, current?.id ?? '')).toBeNull();
    expect(stepsBack(navigation, 'nowhere')).toBeNull();
  });

  it('skips a details entry because it is not a place to land on', () => {
    const newId = counter();
    const root = started('home', newId);
    const rootPlaceId = placeOfTab(root, 'home')?.id ?? '';
    const withDetails = pushedDetails(root, 'book', newId);
    const feed = pushedPlace(withDetails, 'home', locationOfLink(SERIES), newId);

    expect(stepsBack(feed, rootPlaceId)).toBe(2);
  });
});

describe('moved', () => {
  it('moves the current entry back and forward without losing the others', () => {
    const navigation = deep();
    const first = navigation.before[0]!;
    const back = moved(navigation, first.id);
    const forward = moved(back!, navigation.current.id);

    expect(back?.current).toEqual(first);
    expect(back?.after).toHaveLength(2);
    expect(forward?.current).toEqual(navigation.current);
    expect(forward?.after).toEqual([]);
  });

  it('answers nothing for an entry it does not hold', () => {
    expect(moved(deep(), 'unknown')).toBeNull();
  });

  it('drops the entries after the current one when something is pushed', () => {
    const newId = counter();
    const navigation = deep(newId);
    const back = moved(navigation, navigation.before[1]!.id)!;
    const pushed = pushedPlace(back, 'home', locationOfLink(VOYAGE), newId);

    expect(pushed.after).toEqual([]);
    expect(pushed.before).toHaveLength(2);
  });
});

describe('switched', () => {
  it('replaces the current entry at the head of history and parks the place it leaves', () => {
    const newId = counter();
    const navigation = deep(newId);
    const toOther = switched(navigation, 'other', newId);

    expect(toOther.mode).toBe('replace');
    expect(toOther.entries).toHaveLength(1);
    expect(toOther.navigation.before).toEqual(navigation.before);
    expect(labels(toOther.navigation, 'other')).toEqual(['Home']);
    expect(labels(toOther.navigation, 'home')).toEqual(['Home', 'By Series', 'Star Voyage']);
  });

  it('returns to the parked place of a tab without adding an entry', () => {
    const newId = counter();
    const navigation = deep(newId);
    const toOther = switched(navigation, 'other', newId).navigation;

    const back = switched(toOther, 'home', newId);

    expect(back.mode).toBe('replace');
    expect(back.navigation.before).toHaveLength(navigation.before.length);
    expect(labels(back.navigation, 'home')).toEqual(['Home', 'By Series', 'Star Voyage']);
    expect(labels(back.navigation, 'other')).toEqual(['Home']);
  });

  it('pushes instead of replacing when entries lie ahead, dropping them', () => {
    const newId = counter();
    const navigation = deep(newId);
    const behind = moved(navigation, navigation.before[0]!.id)!;

    const result = switched(behind, 'other', newId);

    expect(result.mode).toBe('push');
    expect(result.navigation.after).toEqual([]);
    expect(result.navigation.before).toEqual([behind.current]);
    expect(labels(result.navigation, 'home')).toEqual(['Home']);
  });

  it('puts back the ancestors a parked place has lost its entries for', () => {
    const newId = counter();
    const home = deep(newId);
    const voyage = placeOfTab(home, 'home')!;
    const other = started('other', newId);
    const crafted: Navigation = {
      ...other,
      places: new Map([...home.places, ...other.places]),
      parked: new Map([['home', voyage.id]]),
    };

    const result = switched(crafted, 'home', newId);

    expect(result.mode).toBe('replace');
    expect(result.entries).toHaveLength(3);
    expect(labels(result.navigation, 'home')).toEqual(['Home', 'By Series', 'Star Voyage']);
    expect(stepsBack(result.navigation, result.entries[0]!.place)).toBe(2);
  });

  it('forgets a parked place once its tab is reached by Back', () => {
    const newId = counter();
    const navigation = deep(newId);
    const toOther = switched(navigation, 'other', newId).navigation;
    const behind = moved(toOther, toOther.before[0]!.id)!;

    expect(labels(behind, 'home')).toEqual(['Home']);
  });
});

describe('detailsOf', () => {
  it('names the entry of the details only on the tab they were opened on', () => {
    const newId = counter();
    const opened = pushedDetails(started('home', newId), 'book-1', newId);

    expect(detailsOf(opened, 'home')).toBe('book-1');
    expect(detailsOf(opened, 'other')).toBeNull();
    expect(detailsOf(started('home', newId), 'home')).toBeNull();
  });
});

describe('sameFeedAncestor', () => {
  it('finds the nearest earlier place with the same non-empty feed id', () => {
    const newId = counter();
    const root = started('home', newId);
    const rootId = placeOfTab(root, 'home')?.id ?? '';
    const feed = pushedPlace(
      identified(root, rootId, 'urn:root'),
      'home',
      locationOfLink(SERIES),
      newId,
    );
    const feedId = placeOfTab(feed, 'home')?.id ?? '';
    const again = identified(feed, feedId, 'urn:root');

    expect(sameFeedAncestor(again, feedId)).toBe(rootId);
  });

  it('never matches an empty feed id', () => {
    const navigation = deep();
    const place = placeOfTab(navigation, 'home');

    expect(sameFeedAncestor(navigation, place?.id ?? '')).toBeNull();
  });
});

describe('replacedLocation', () => {
  it('changes the location of a place and forgets what it learned', () => {
    const newId = counter();
    const search = pushedPlace(
      started('home', newId),
      'home',
      { kind: 'search', search: HOME_SEARCH, query: 'moon' },
      newId,
    );
    const id = placeOfTab(search, 'home')?.id ?? '';
    const replaced = replacedLocation(identified(search, id, 'x'), id, {
      kind: 'search',
      search: HOME_SEARCH,
      query: 'moons',
    });

    expect(placeOfTab(replaced, 'home')).toMatchObject({
      feedId: '',
      location: { kind: 'search', query: 'moons' },
    });
    expect(replaced.before).toEqual(search.before);
  });
});
