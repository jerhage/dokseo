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
  #selections = new Map<CatalogId, ReadonlySet<string>>();
  #scrolls = new Map<CatalogId, number>();
  #searchOrigins = new Map<CatalogId, FeedPosition>();

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
    this.#selections.delete(id);
    this.#scrolls.delete(id);
  }

  searchOriginOf(id: CatalogId): FeedPosition | null {
    return this.#searchOrigins.get(id) ?? null;
  }

  keepSearchOrigin(id: CatalogId, position: FeedPosition): void {
    this.#searchOrigins.set(id, position);
  }

  dropSearchOrigin(id: CatalogId): void {
    this.#searchOrigins.delete(id);
  }

  selectionOf(id: CatalogId): ReadonlySet<string> {
    return this.#selections.get(id) ?? new Set();
  }

  keepSelection(id: CatalogId, entryIds: ReadonlySet<string>): void {
    this.#selections.set(id, entryIds);
  }

  keepScroll(id: CatalogId, top: number): void {
    this.#scrolls.set(id, top);
  }

  takeScroll(id: CatalogId): number {
    const top = this.#scrolls.get(id) ?? 0;
    this.#scrolls.delete(id);
    return top;
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
