import { describe, expect, it } from 'vitest';
import { HOME_SEARCH, feedAddress } from '../domain/catalog-feed-fixtures';
import { searchFieldFor } from './catalog-search-field';
import { CatalogSession } from './catalog-session.svelte';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';
import { createFeedSearch } from './feed-search.svelte';
import type { SearchClock } from './feed-search.svelte';
import { createNavigation } from './navigation.svelte';
import type { HistoryPort } from './navigation.svelte';

const NOW: SearchClock = {
  after: (_ms, run) => {
    queue.push(run);
    return () => undefined;
  },
};

const queue: (() => void)[] = [];

function fire(): void {
  for (const run of queue.splice(0)) run();
}

function setup() {
  queue.length = 0;
  let n = 0;
  const pushes: string[] = [];
  const port: HistoryPort = {
    push: () => void pushes.push('push'),
    replace: () => undefined,
    back: () => undefined,
    go: () => undefined,
  };
  const session = new CatalogSession();
  const navigation = createNavigation(session, port, () => `i${++n}`);
  navigation.arrive(undefined);
  navigation.select(HOME.id);
  const search = createFeedSearch(NOW);
  const deps = { navigation, search, session };
  return { deps, navigation, session, pushes };
}

function loaded(session: CatalogSession, place: string, withSearch = true): void {
  session.keepReading(place, { kind: 'ready', search: withSearch ? HOME_SEARCH : null });
}

describe('searchFieldFor', () => {
  it('names the catalog in the placeholder while its feed is read', () => {
    const { deps } = setup();

    const field = searchFieldFor(HOME, deps);

    expect(field.placeholder).toBe('Search Home');
    expect(field.disabled).toBe(false);
  });

  it('disables the field of a catalog whose feed is read and offers no search', () => {
    const { deps, navigation, session } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id, false);

    const field = searchFieldFor(HOME, deps);

    expect(field.placeholder).toBe('Home has no search');
    expect(field.disabled).toBe(true);
  });

  it('searches once after typing pauses and shows the typed text', () => {
    const { deps, navigation, session, pushes } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);
    const pushed = pushes.length;

    searchFieldFor(HOME, deps).oninput('moon');
    expect(searchFieldFor(HOME, deps).value).toBe('moon');
    fire();

    expect(pushes).toHaveLength(pushed + 1);
    expect(navigation.crumbs(HOME.id, 'Home').map((crumb) => crumb.label)).toEqual([
      'Home',
      'Search: moon',
    ]);
    expect(searchFieldFor(HOME, deps).value).toBe('moon');
  });

  it('types again over the search without a second browser entry', () => {
    const { deps, navigation, session, pushes } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);
    searchFieldFor(HOME, deps).oninput('moo');
    fire();
    const pushed = pushes.length;

    searchFieldFor(HOME, deps).oninput('moon');
    fire();

    expect(pushes).toHaveLength(pushed);
    expect(navigation.crumbs(HOME.id, 'Home').map((crumb) => crumb.label)).toEqual([
      'Home',
      'Search: moon',
    ]);
  });

  it('sends no search when the tab changed before the pause ended', () => {
    const { deps, navigation, session } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);
    searchFieldFor(HOME, deps).oninput('moon');

    navigation.select(ARCHIVE.id);
    fire();

    expect(navigation.crumbs(HOME.id, 'Home').map((crumb) => crumb.label)).toEqual(['Home']);
  });

  it('searches at once on submit', () => {
    const { deps, navigation, session } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);

    searchFieldFor(HOME, deps).onsubmit('moon');

    expect(navigation.crumbs(HOME.id, 'Home').map((crumb) => crumb.label)).toEqual([
      'Home',
      'Search: moon',
    ]);
  });

  it('changes nothing when the field empties and no search is shown', () => {
    const { deps, pushes, session, navigation } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);
    const pushed = pushes.length;

    searchFieldFor(HOME, deps).oninput('');
    fire();

    expect(pushes).toHaveLength(pushed);
  });

  it('shows no text on a feed other than the one the search was typed for', () => {
    const { deps, navigation, session } = setup();
    loaded(session, navigation.placeOf(HOME.id)!.id);
    searchFieldFor(HOME, deps).onsubmit('moon');
    const place = navigation.placeOf(HOME.id)!;
    expect(place.location).toEqual({ kind: 'search', search: HOME_SEARCH, query: 'moon' });
    navigation.open(HOME.id, {
      title: 'Other',
      address: feedAddress('https://x.test'),
      summary: '',
    });

    expect(searchFieldFor(HOME, deps).value).toBe('');
  });
});
