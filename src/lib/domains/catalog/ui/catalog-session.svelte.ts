import type { CatalogId } from '$lib/shared/ids';
import { DEVICE_TAB } from './library-tabs';
import { ROOT_POSITION } from './feed-address';
import type { FeedPosition } from './feed-address';
import { ALL_FILTER } from './origin-filter';
import type { OriginFilter } from './origin-filter';

class CatalogSession {
  selected = $state<string>(DEVICE_TAB);
  originFilter = $state.raw<OriginFilter>(ALL_FILTER);
  queries = $state.raw<ReadonlyMap<CatalogId, string>>(new Map());
  #positions = new Map<CatalogId, FeedPosition>();
  #pages = new Map<CatalogId, readonly string[]>();

  queryOf(id: CatalogId): string {
    return this.queries.get(id) ?? '';
  }

  type(id: CatalogId, query: string): void {
    this.queries = new Map(this.queries).set(id, query);
  }

  positionOf(id: CatalogId): FeedPosition {
    return this.#positions.get(id) ?? ROOT_POSITION;
  }

  move(id: CatalogId, position: FeedPosition): void {
    this.#positions.set(id, position);
    this.#pages.delete(id);
  }

  pagesOf(id: CatalogId): readonly string[] {
    return this.#pages.get(id) ?? [];
  }

  appendPage(id: CatalogId, url: string): void {
    this.#pages.set(id, [...this.pagesOf(id), url]);
  }
}

const catalogSession = new CatalogSession();

export { CatalogSession, catalogSession };
