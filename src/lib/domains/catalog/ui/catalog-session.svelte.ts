import type { CatalogId } from '$lib/shared/ids';
import { DEVICE_TAB } from './library-tabs';
import { ROOT_POSITION } from './feed-address';
import type { FeedPosition } from './feed-address';
import { ALL_FILTER } from './origin-filter';
import type { OriginFilter } from './origin-filter';

type Trail = { readonly positions: readonly FeedPosition[]; readonly at: number };

type Sought = { readonly position: FeedPosition; readonly before: FeedPosition | null };

const START_OF_TRAIL: Trail = { positions: [ROOT_POSITION], at: 0 };

class CatalogSession {
  selected = $state<string>(DEVICE_TAB);
  originFilter = $state.raw<OriginFilter>(ALL_FILTER);
  queries = $state.raw<ReadonlyMap<CatalogId, string>>(new Map());
  #trails = new Map<CatalogId, Trail>();
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
    const { positions, at } = this.#trailOf(id);
    return positions[at] ?? ROOT_POSITION;
  }

  trailIndexOf(id: CatalogId): number {
    return this.#trailOf(id).at;
  }

  advance(id: CatalogId): void {
    const { positions, at } = this.#trailOf(id);
    const here = positions[at] ?? ROOT_POSITION;
    this.#trails.set(id, { positions: [...positions.slice(0, at + 1), here], at: at + 1 });
  }

  seek(id: CatalogId, index: number): Sought | null {
    const { positions } = this.#trailOf(id);
    const position = positions[index];
    if (position === undefined) return null;
    this.#trails.set(id, { positions, at: index });
    return { position, before: positions[index - 1] ?? null };
  }

  move(id: CatalogId, position: FeedPosition): void {
    const { positions, at } = this.#trailOf(id);
    const next = [...positions];
    next[at] = position;
    this.#trails.set(id, { positions: next, at });
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

  #trailOf(id: CatalogId): Trail {
    return this.#trails.get(id) ?? START_OF_TRAIL;
  }
}

const catalogSession = new CatalogSession();

export { CatalogSession, catalogSession };
export type { Sought };
