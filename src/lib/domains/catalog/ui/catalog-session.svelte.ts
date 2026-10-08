import type { CatalogId } from '$lib/shared/ids';
import { DEVICE_TAB } from './library-tabs';
import { ROOT_POSITION } from './feed-address';
import type { FeedPosition } from './feed-address';
import { ALL_FILTER } from './origin-filter';
import type { OriginFilter } from './origin-filter';

class CatalogSession {
  selected = $state<string>(DEVICE_TAB);
  originFilter = $state.raw<OriginFilter>(ALL_FILTER);
  #positions = new Map<CatalogId, FeedPosition>();

  positionOf(id: CatalogId): FeedPosition {
    return this.#positions.get(id) ?? ROOT_POSITION;
  }

  move(id: CatalogId, position: FeedPosition): void {
    this.#positions.set(id, position);
  }
}

const catalogSession = new CatalogSession();

export { CatalogSession, catalogSession };
