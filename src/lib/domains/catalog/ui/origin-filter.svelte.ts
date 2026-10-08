import type { BookId, CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';
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

type OriginFilterUseCases = {
  readonly listCatalogs: () => Promise<ListCatalogsResult>;
  readonly listOrigins: () => Promise<ListOriginsResult>;
};

class OriginFilterView {
  catalogs = $state.raw<readonly Catalog[]>([]);
  origins = $state.raw<ReadonlyMap<BookId, CatalogId>>(new Map());

  #session: CatalogSession;
  #cases: OriginFilterUseCases;

  constructor(session: CatalogSession, cases: OriginFilterUseCases) {
    this.#session = session;
    this.#cases = cases;
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

  async load(): Promise<void> {
    const [catalogs, origins] = await Promise.all([
      this.#cases.listCatalogs(),
      this.#cases.listOrigins(),
    ]);
    this.catalogs = catalogs.kind === 'success' ? catalogs.catalogs : [];
    this.origins = new Map(
      origins.kind === 'success'
        ? origins.origins.map((origin) => [origin.bookId, origin.catalogId])
        : [],
    );
  }

  #ownerOf(id: BookId): CatalogId | null {
    const owner = this.origins.get(id);
    if (owner === undefined) return null;
    return this.catalogs.some((catalog) => catalog.id === owner) ? owner : null;
  }
}

export { OriginFilterView };
export type { OriginFilterUseCases };
