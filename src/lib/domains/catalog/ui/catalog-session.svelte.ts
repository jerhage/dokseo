import type { FeedSearch } from '../domain/catalog-feed';
import { DEVICE_TAB } from './library-tabs';
import { browserId, started } from './navigation';
import type { Navigation, NewId, PlaceId } from './navigation';
import { ALL_FILTER } from './origin-filter';
import type { OriginFilter } from './origin-filter';

type FeedReading =
  | { readonly kind: 'failed' }
  | { readonly kind: 'ready'; readonly search: FeedSearch | null };

class CatalogSession {
  navigation = $state.raw<Navigation>(started(DEVICE_TAB, browserId));
  readings = $state.raw<ReadonlyMap<PlaceId, FeedReading>>(new Map());
  originFilter = $state.raw<OriginFilter>(ALL_FILTER);
  #selections = new Map<PlaceId, ReadonlySet<string>>();
  #scrolls = new Map<PlaceId, number>();

  restart(tab: string, newId: NewId = browserId): void {
    this.navigation = started(tab, newId);
    this.readings = new Map();
    this.#selections = new Map();
    this.#scrolls = new Map();
  }

  keepReading(place: PlaceId, reading: FeedReading): void {
    this.readings = new Map(this.readings).set(place, reading);
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
    const next = new Map(this.readings);
    next.delete(place);
    this.readings = next;
  }
}

const catalogSession = new CatalogSession();

export { CatalogSession, catalogSession };
export type { FeedReading };
