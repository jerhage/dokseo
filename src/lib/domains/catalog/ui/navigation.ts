import { ROOT_LOCATION } from '../domain/catalog-feed';
import type {
  FeedAddress,
  FeedLocation,
  FeedSearch,
  NavigationLink,
  TrailStep,
} from '../domain/catalog-feed';

type EntryId = string;

type PlaceId = string;

type NewId = () => string;

type Location =
  | { readonly kind: 'root' }
  | { readonly kind: 'feed'; readonly address: FeedAddress; readonly title: string }
  | { readonly kind: 'search'; readonly search: FeedSearch; readonly query: string };

type Place = {
  readonly id: PlaceId;
  readonly tab: string;
  readonly parent: PlaceId | null;
  readonly location: Location;
  readonly feedId: string;
};

type StackEntry =
  | {
      readonly kind: 'location';
      readonly id: EntryId;
      readonly tab: string;
      readonly place: PlaceId;
    }
  | {
      readonly kind: 'details';
      readonly id: EntryId;
      readonly tab: string;
      readonly place: PlaceId;
      readonly entryId: string;
    };

type Navigation = {
  readonly places: ReadonlyMap<PlaceId, Place>;
  readonly parked: ReadonlyMap<string, PlaceId>;
  readonly before: readonly StackEntry[];
  readonly current: StackEntry;
  readonly after: readonly StackEntry[];
};

type Crumb = { readonly label: string; readonly place: PlaceId };

type HistoryState = { readonly tab: string; readonly entryId: EntryId };

type SwitchMode = 'replace' | 'push';

type Switched = {
  readonly navigation: Navigation;
  readonly entries: readonly StackEntry[];
  readonly mode: SwitchMode;
};

const ROOT: Location = { kind: 'root' };

function locationEntry(id: EntryId, place: Place): StackEntry {
  return { kind: 'location', id, tab: place.tab, place: place.id };
}

function rootPlace(tab: string, id: PlaceId): Place {
  return { id, tab, parent: null, location: ROOT, feedId: '' };
}

function started(tab: string, newId: NewId): Navigation {
  const place = rootPlace(tab, newId());
  return {
    places: new Map([[place.id, place]]),
    parked: new Map(),
    before: [],
    current: locationEntry(newId(), place),
    after: [],
  };
}

function entriesOf(navigation: Navigation): readonly StackEntry[] {
  return [...navigation.before, navigation.current, ...navigation.after];
}

function placeById(navigation: Navigation, id: PlaceId): Place | null {
  return navigation.places.get(id) ?? null;
}

function rootOf(navigation: Navigation, tab: string): Place | null {
  for (const place of navigation.places.values()) {
    if (place.tab === tab && place.parent === null) return place;
  }
  return null;
}

function placeOfTab(navigation: Navigation, tab: string): Place | null {
  if (navigation.current.tab === tab) return placeById(navigation, navigation.current.place);
  const parked = navigation.parked.get(tab);
  if (parked !== undefined) return placeById(navigation, parked);
  const entry = entriesOf(navigation).findLast((candidate) => candidate.tab === tab);
  if (entry === undefined) return rootOf(navigation, tab);
  return placeById(navigation, entry.place);
}

function hasTab(navigation: Navigation, tab: string): boolean {
  return rootOf(navigation, tab) !== null;
}

function appended(
  navigation: Navigation,
  entry: StackEntry,
  places = navigation.places,
): Navigation {
  return {
    ...navigation,
    places,
    before: [...navigation.before, navigation.current],
    current: entry,
    after: [],
  };
}

function withPlace(navigation: Navigation, place: Place): ReadonlyMap<PlaceId, Place> {
  return new Map(navigation.places).set(place.id, place);
}

function locationOfLink(link: NavigationLink): Location {
  return { kind: 'feed', address: link.address, title: link.title };
}

function pushedPlace(
  navigation: Navigation,
  tab: string,
  location: Location,
  newId: NewId,
): Navigation {
  const parent = placeOfTab(navigation, tab);
  const place: Place = {
    id: newId(),
    tab,
    parent: parent === null ? null : parent.id,
    location,
    feedId: '',
  };
  return appended(navigation, locationEntry(newId(), place), withPlace(navigation, place));
}

function pushedExisting(navigation: Navigation, placeId: PlaceId, newId: NewId): Navigation {
  const place = placeById(navigation, placeId);
  if (place === null) return navigation;
  return appended(navigation, locationEntry(newId(), place));
}

function arrived(navigation: Navigation, newId: NewId): Navigation {
  const tab = navigation.current.tab;
  const shown = placeOfTab(navigation, tab);
  if (shown === null) return started(tab, newId);
  const parked = new Map<string, PlaceId>();
  for (const place of navigation.places.values()) {
    if (place.parent !== null || place.tab === tab) continue;
    const last = placeOfTab(navigation, place.tab);
    if (last !== null) parked.set(place.tab, last.id);
  }
  return {
    places: navigation.places,
    parked,
    before: [],
    current: locationEntry(newId(), shown),
    after: [],
  };
}

function pushedDetails(navigation: Navigation, entryId: string, newId: NewId): Navigation {
  const { current } = navigation;
  return appended(navigation, {
    kind: 'details',
    id: newId(),
    tab: current.tab,
    place: current.place,
    entryId,
  });
}

function reachable(below: readonly StackEntry[], place: PlaceId): boolean {
  return below.some((entry) => entry.kind === 'location' && entry.place === place);
}

function switched(navigation: Navigation, tab: string, newId: NewId): Switched {
  const mode: SwitchMode = navigation.after.length === 0 ? 'replace' : 'push';
  const existing = placeOfTab(navigation, tab);
  const target = existing ?? rootPlace(tab, newId());
  const places = existing === null ? withPlace(navigation, target) : navigation.places;
  const below = mode === 'replace' ? navigation.before : [...navigation.before, navigation.current];
  const missing: Place[] = [];
  for (let parent = target.parent; parent !== null;) {
    const ancestor = places.get(parent);
    if (ancestor === undefined || reachable(below, ancestor.id)) break;
    missing.unshift(ancestor);
    parent = ancestor.parent;
  }
  const entries = [...missing, target].map((place) => locationEntry(newId(), place));
  const parked = new Map(navigation.parked);
  parked.delete(tab);
  if (mode === 'replace') parked.set(navigation.current.tab, navigation.current.place);
  else parked.delete(navigation.current.tab);
  const [first = locationEntry(newId(), target), ...rest] = entries;
  let result: Navigation = { ...navigation, places, parked, current: first, after: [] };
  if (mode === 'push') result = { ...result, before: [...navigation.before, navigation.current] };
  for (const entry of rest) result = appended(result, entry);
  return { navigation: result, entries, mode };
}

function moved(navigation: Navigation, entryId: EntryId): Navigation | null {
  const all = entriesOf(navigation);
  const index = all.findIndex((entry) => entry.id === entryId);
  const target = all[index];
  if (target === undefined) return null;
  const parked = new Map(navigation.parked);
  parked.delete(target.tab);
  return {
    places: navigation.places,
    parked,
    before: all.slice(0, index),
    current: target,
    after: all.slice(index + 1),
  };
}

function replacedLocation(
  navigation: Navigation,
  placeId: PlaceId,
  location: Location,
): Navigation {
  const place = placeById(navigation, placeId);
  if (place === null) return navigation;
  return { ...navigation, places: withPlace(navigation, { ...place, location, feedId: '' }) };
}

function identified(navigation: Navigation, placeId: PlaceId, feedId: string): Navigation {
  const place = placeById(navigation, placeId);
  if (place === null || place.feedId === feedId) return navigation;
  return { ...navigation, places: withPlace(navigation, { ...place, feedId }) };
}

function stepsBack(navigation: Navigation, placeId: PlaceId): number | null {
  const { before } = navigation;
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const entry = before[index];
    if (entry !== undefined && entry.kind === 'location' && entry.place === placeId) {
      return before.length - index;
    }
  }
  return null;
}

function ancestorsOf(navigation: Navigation, placeId: PlaceId): readonly Place[] {
  const chain: Place[] = [];
  for (let next = placeById(navigation, placeId); next !== null;) {
    chain.push(next);
    next = next.parent === null ? null : placeById(navigation, next.parent);
  }
  return chain;
}

function sameFeedAncestor(navigation: Navigation, placeId: PlaceId): PlaceId | null {
  const [self, ...ancestors] = ancestorsOf(navigation, placeId);
  if (self === undefined || self.feedId === '') return null;
  return ancestors.find((ancestor) => ancestor.feedId === self.feedId)?.id ?? null;
}

function searchStepTitle(query: string): string {
  return `Search: ${query.trim()}`;
}

function labelOf(place: Place, rootTitle: string): string {
  const { location } = place;
  if (location.kind === 'root') return rootTitle;
  if (location.kind === 'feed') return location.title;
  return searchStepTitle(location.query);
}

function crumbsOf(navigation: Navigation, tab: string, rootTitle: string): readonly Crumb[] {
  const place = placeOfTab(navigation, tab);
  if (place === null) return [];
  return ancestorsOf(navigation, place.id)
    .toReversed()
    .map((step) => ({ label: labelOf(step, rootTitle), place: step.id }));
}

function pathOf(navigation: Navigation, placeId: PlaceId): readonly TrailStep[] {
  const steps: TrailStep[] = [];
  for (const place of ancestorsOf(navigation, placeId).toReversed()) {
    const { location } = place;
    if (location.kind === 'search')
      return [{ title: searchStepTitle(location.query), address: null }];
    if (location.kind === 'feed') steps.push({ title: location.title, address: location.address });
  }
  return steps;
}

function feedLocationOf(place: Place): FeedLocation {
  const { location } = place;
  if (location.kind === 'search') return location;
  if (location.kind === 'feed') return { kind: 'address', address: location.address };
  return ROOT_LOCATION;
}

function detailsOf(navigation: Navigation, tab: string): string | null {
  const { current } = navigation;
  return current.kind === 'details' && current.tab === tab ? current.entryId : null;
}

function stateOf(entry: StackEntry): HistoryState {
  return { tab: entry.tab, entryId: entry.id };
}

function browserId(): string {
  return crypto.randomUUID();
}

export {
  ancestorsOf,
  arrived,
  browserId,
  crumbsOf,
  detailsOf,
  feedLocationOf,
  hasTab,
  identified,
  locationOfLink,
  moved,
  pathOf,
  placeById,
  placeOfTab,
  pushedDetails,
  pushedExisting,
  pushedPlace,
  replacedLocation,
  sameFeedAncestor,
  searchStepTitle,
  started,
  stateOf,
  stepsBack,
  switched,
};
export type {
  Crumb,
  EntryId,
  HistoryState,
  Location,
  Navigation,
  NewId,
  Place,
  PlaceId,
  StackEntry,
  Switched,
  SwitchMode,
};
