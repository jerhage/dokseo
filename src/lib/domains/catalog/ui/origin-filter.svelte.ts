import type { BookId, CatalogId } from '$lib/shared/ids';
import type { ReadState } from '$lib/shared/read-state';
import type { Catalog } from '../domain/catalog';
import { listedOrigins } from './catalog-list';
import type { OriginsListed, OriginsListing } from './catalog-list';
import type { CatalogSession } from './catalog-session.svelte';
import {
  filterOptions,
  filterValue,
  matchesFilter,
  parsedFilter,
  shownFilter,
  sourceText,
} from './origin-filter';
import type { OriginFilterOption } from './origin-filter';

type OriginFilterListing = () => ReadState<OriginsListing>;

class OriginFilterView {
  #session: CatalogSession;
  #listed: OriginsListed;

  constructor(session: CatalogSession, listing: OriginFilterListing) {
    this.#session = session;
    this.#listed = $derived(listedOrigins(listing()));
  }

  get catalogs(): readonly Catalog[] {
    return this.#listed.catalogs;
  }

  get visible(): boolean {
    return this.catalogs.length > 0;
  }

  get options(): readonly OriginFilterOption[] {
    return filterOptions(this.catalogs);
  }

  get value(): string {
    return filterValue(shownFilter(this.#session.originFilter, this.catalogs));
  }

  choose(value: string): void {
    this.#session.originFilter = parsedFilter(value, this.catalogs);
  }

  badgeFor(id: BookId): string | null {
    const owner = this.#ownerOf(id);
    return this.catalogs.find((catalog) => catalog.id === owner)?.title ?? null;
  }

  sourceFor(id: BookId): string {
    return sourceText(this.badgeFor(id));
  }

  matches(id: BookId): boolean {
    const filter = shownFilter(this.#session.originFilter, this.catalogs);
    return matchesFilter(filter, this.#ownerOf(id));
  }

  #ownerOf(id: BookId): CatalogId | null {
    const owner = this.#listed.owners.get(id);
    if (owner === undefined) return null;
    return this.catalogs.some((catalog) => catalog.id === owner) ? owner : null;
  }
}

export { OriginFilterView };
export type { OriginFilterListing };
