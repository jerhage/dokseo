import type { NavigationLink } from '../domain/catalog-feed';
import { DEVICE_TAB } from './library-tabs';
import { browserId, started } from './navigation';
import type { Navigation, NewId, PlaceId } from './navigation';
import { ALL_FILTER } from './origin-filter';
import type { OriginFilter } from './origin-filter';

type Opening =
  | { readonly kind: 'idle' }
  | { readonly kind: 'resolving'; readonly tab: string; readonly link: NavigationLink };

const NOT_OPENING: Opening = { kind: 'idle' };

class CatalogSession {
  navigation = $state.raw<Navigation>(started(DEVICE_TAB, browserId));
  opening = $state.raw<Opening>(NOT_OPENING);
  originFilter = $state.raw<OriginFilter>(ALL_FILTER);
  #selections = new Map<PlaceId, ReadonlySet<string>>();
  #scrolls = new Map<PlaceId, number>();

  restart(tab: string, newId: NewId = browserId): void {
    this.navigation = started(tab, newId);
    this.opening = NOT_OPENING;
    this.#selections = new Map();
    this.#scrolls = new Map();
  }

  selectionOf(place: PlaceId): ReadonlySet<string> {
    return this.#selections.get(place) ?? new Set();
  }

  keepSelection(place: PlaceId, entryIds: ReadonlySet<string>): void {
    this.#selections.set(place, entryIds);
  }

  scrollOf(place: PlaceId): number {
    return this.#scrolls.get(place) ?? 0;
  }

  keepScroll(place: PlaceId, top: number): void {
    this.#scrolls.set(place, top);
  }

  forgetPlace(place: PlaceId): void {
    this.#selections.delete(place);
    this.#scrolls.delete(place);
  }
}

const catalogSession = new CatalogSession();

export { CatalogSession, NOT_OPENING, catalogSession };
export type { Opening };
