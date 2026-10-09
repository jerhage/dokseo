import type { FeedSearch, NavigationLink } from '../domain/catalog-feed';
import { NOT_OPENING } from './catalog-session.svelte';
import type { CatalogSession, Opening } from './catalog-session.svelte';
import type { FirstPageReader, LinkReader, ResolvedLink } from './link-resolution';
import {
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
  placeWithFeed,
  pushedDetails,
  pushedExisting,
  pushedPlace,
  replacedLocation,
  sameFeedAncestor,
  stateOf,
  stepsBack,
  switched,
} from './navigation';
import type {
  Crumb,
  EntryId,
  HistoryState,
  Location,
  Navigation,
  NewId,
  Place,
  PlaceId,
} from './navigation';

type HistoryPort = {
  readonly push: (state: HistoryState) => void;
  readonly replace: (state: HistoryState) => void;
  readonly back: () => void;
  readonly go: (delta: number) => void;
};

const NO_FIRST_PAGE: FirstPageReader = () => Promise.resolve(null);

function createNavigation(
  session: CatalogSession,
  port: HistoryPort,
  newId: NewId = browserId,
  firstPage: FirstPageReader = NO_FIRST_PAGE,
) {
  const resolving = new Map<PlaceId, Location>();

  async function resolveFirstPage(placeId: PlaceId): Promise<void> {
    const place = placeById(session.navigation, placeId);
    if (place === null || place.feedId !== '' || resolving.get(place.id) === place.location) return;
    resolving.set(place.id, place.location);
    const feedId = await firstPage(
      place.tab,
      feedLocationOf(place),
      pathOf(session.navigation, place.id),
    );
    if (resolving.get(place.id) === place.location) resolving.delete(place.id);
    if (feedId === null) return;
    const now = placeById(session.navigation, place.id);
    if (now === null || now.location !== place.location) return;
    identify(place.id, feedId);
  }

  function identify(place: PlaceId, feedId: string): void {
    session.navigation = identified(session.navigation, place, feedId);
    const { current } = session.navigation;
    if (current.kind !== 'location' || current.place !== place) return;
    const ancestor = sameFeedAncestor(session.navigation, place);
    if (ancestor !== null) goTo(ancestor);
  }

  function resolveCurrent(): void {
    const { current } = session.navigation;
    if (current.kind === 'location') void resolveFirstPage(current.place);
  }

  function keep(next: Navigation): void {
    session.navigation = next;
    resolveCurrent();
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

  function ascend(place: PlaceId): void {
    const { current } = session.navigation;
    if (current.kind === 'location' && current.place === place) return;
    if (goTo(place)) return;
    pushTo(pushedExisting(session.navigation, place, newId));
  }

  async function resolve(
    tab: string,
    link: NavigationLink,
    read: LinkReader,
  ): Promise<ResolvedLink> {
    const place = placeOfTab(session.navigation, tab);
    const path = place === null ? [] : pathOf(session.navigation, place.id);
    try {
      return await read(link, [...path, { title: link.title, address: link.address }]);
    } catch {
      return { kind: 'unreadable' };
    }
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
      if (state === undefined) keep(arrived(session.navigation, newId));
      else {
        session.restart(session.navigation.current.tab, newId);
        resolveCurrent();
      }
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
    async follow(tab: string, link: NavigationLink, read: LinkReader): Promise<void> {
      if (session.opening.kind === 'resolving') return;
      const entry = session.navigation.current.id;
      const attempt: Opening = { kind: 'resolving', tab, link };
      session.opening = attempt;
      const resolved = await resolve(tab, link, read);
      if (session.opening !== attempt) return;
      session.opening = NOT_OPENING;
      if (session.navigation.current.id !== entry) return;
      const here = placeOfTab(session.navigation, tab);
      const same =
        resolved.kind === 'feed' && here !== null
          ? placeWithFeed(session.navigation, here.id, resolved.feedId)
          : null;
      if (same === null) this.open(tab, link);
      else ascend(same);
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
      ascend(place.parent);
    },
    goTo,
    ascend,
    openDetails(entryId: string): void {
      if (session.navigation.current.kind !== 'location') return;
      pushTo(pushedDetails(session.navigation, entryId, newId));
    },
    closeDetails(): void {
      if (session.navigation.current.kind !== 'details') return;
      const { before } = session.navigation;
      const previous = before.at(-1);
      if (previous !== undefined) {
        const found = moved(session.navigation, previous.id);
        if (found !== null) keep(found);
      }
      port.back();
    },
    identify,
    resolveFirstPage,
  };
}

export { createNavigation };
export type { HistoryPort };
