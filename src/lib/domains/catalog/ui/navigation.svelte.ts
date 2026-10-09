import type { FeedSearch, NavigationLink } from '../domain/catalog-feed';
import type { CatalogSession } from './catalog-session.svelte';
import {
  ancestorsOf,
  browserId,
  crumbsOf,
  detailsOf,
  hasTab,
  identified,
  locationOfLink,
  moved,
  pathOf,
  placeById,
  placeOfTab,
  pushedDetails,
  pushedPlace,
  replacedLocation,
  sameFeedAncestor,
  stateOf,
  stepsBack,
  switched,
} from './navigation';
import type { Crumb, EntryId, HistoryState, Navigation, NewId, Place, PlaceId } from './navigation';

type HistoryPort = {
  readonly push: (state: HistoryState) => void;
  readonly replace: (state: HistoryState) => void;
  readonly back: () => void;
  readonly go: (delta: number) => void;
};

function createNavigation(session: CatalogSession, port: HistoryPort, newId: NewId = browserId) {
  function keep(next: Navigation): void {
    session.navigation = next;
  }

  function pushTo(next: Navigation): void {
    keep(next);
    port.push(stateOf(next.current));
  }

  function goTo(place: PlaceId): boolean {
    const steps = stepsBack(session.navigation, place);
    if (steps === null) return false;
    port.go(-steps);
    return true;
  }

  return {
    get current() {
      return session.navigation.current;
    },
    get tab(): string {
      return session.navigation.current.tab;
    },
    place(id: PlaceId): Place | null {
      return placeById(session.navigation, id);
    },
    placeOf(tab: string): Place | null {
      return placeOfTab(session.navigation, tab);
    },
    hasTab(tab: string): boolean {
      return hasTab(session.navigation, tab);
    },
    crumbs(tab: string, rootTitle: string): readonly Crumb[] {
      return crumbsOf(session.navigation, tab, rootTitle);
    },
    chain(place: PlaceId): readonly Place[] {
      return ancestorsOf(session.navigation, place);
    },
    pathOf(place: PlaceId) {
      return pathOf(session.navigation, place);
    },
    detailsOf(tab: string): string | null {
      return detailsOf(session.navigation, tab);
    },
    arrive(state: HistoryState | undefined): void {
      const found = state === undefined ? null : moved(session.navigation, state.entryId);
      if (found !== null) {
        keep(found);
        return;
      }
      session.restart(session.navigation.current.tab, newId);
      port.replace(stateOf(session.navigation.current));
    },
    observe(state: HistoryState | undefined): void {
      if (state === undefined) return;
      const found = moved(session.navigation, state.entryId);
      if (found === null || found.current.id === session.navigation.current.id) return;
      keep(found);
    },
    select(tab: string): void {
      if (tab === session.navigation.current.tab) return;
      const { navigation, entries, mode } = switched(session.navigation, tab, newId);
      keep(navigation);
      entries.forEach((entry, index) => {
        if (index === 0 && mode === 'replace') port.replace(stateOf(entry));
        else port.push(stateOf(entry));
      });
    },
    open(tab: string, link: NavigationLink): void {
      pushTo(pushedPlace(session.navigation, tab, locationOfLink(link), newId));
    },
    search(tab: string, search: FeedSearch, query: string): EntryId {
      const place = placeOfTab(session.navigation, tab);
      const location = { kind: 'search', search, query } as const;
      if (place !== null && place.location.kind === 'search') {
        session.forgetPlace(place.id);
        keep(replacedLocation(session.navigation, place.id, location));
      } else {
        pushTo(pushedPlace(session.navigation, tab, location, newId));
      }
      return session.navigation.current.id;
    },
    leaveSearch(tab: string): void {
      const place = placeOfTab(session.navigation, tab);
      if (place === null || place.location.kind !== 'search' || place.parent === null) return;
      goTo(place.parent);
    },
    goTo,
    openDetails(entryId: string): void {
      if (session.navigation.current.kind !== 'location') return;
      pushTo(pushedDetails(session.navigation, entryId, newId));
    },
    closeDetails(): void {
      if (session.navigation.current.kind === 'details') port.back();
    },
    identify(place: PlaceId, feedId: string): void {
      keep(identified(session.navigation, place, feedId));
      const { current } = session.navigation;
      if (current.kind !== 'location' || current.place !== place) return;
      const ancestor = sameFeedAncestor(session.navigation, place);
      if (ancestor !== null) goTo(ancestor);
    },
  };
}

export { createNavigation };
export type { HistoryPort };
