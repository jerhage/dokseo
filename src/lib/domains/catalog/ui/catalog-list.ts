import { match } from 'ts-pattern';
import type { BookId, CatalogId } from '$lib/shared/ids';
import type { ReadState } from '$lib/shared/read-state';
import type { Catalog } from '../domain/catalog';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';

type CatalogListState =
  | {
      readonly kind: 'ready';
      readonly catalogs: readonly Catalog[];
      readonly unreadable: readonly CatalogId[];
    }
  | { readonly kind: 'storage-unavailable' };

type OriginsListing = {
  readonly catalogs: ListCatalogsResult;
  readonly origins: ListOriginsResult;
};

type OriginsListed = {
  readonly catalogs: readonly Catalog[];
  readonly owners: ReadonlyMap<BookId, CatalogId>;
};

const NO_CATALOGS: readonly Catalog[] = [];

const NO_OWNERS: ReadonlyMap<BookId, CatalogId> = new Map();

function catalogListOf(listing: ListCatalogsResult): CatalogListState {
  return match(listing)
    .returnType<CatalogListState>()
    .with({ kind: 'success' }, ({ catalogs, unreadable }) => ({
      kind: 'ready',
      catalogs,
      unreadable: unreadable.map((row) => row.id),
    }))
    .with({ kind: 'storage-unavailable' }, () => ({ kind: 'storage-unavailable' }))
    .exhaustive();
}

function catalogsIn(listing: ListCatalogsResult): readonly Catalog[] {
  return listing.kind === 'success' ? listing.catalogs : NO_CATALOGS;
}

function listedCatalogs(state: ReadState<ListCatalogsResult>): readonly Catalog[] {
  return state.kind === 'ready' ? catalogsIn(state.value) : NO_CATALOGS;
}

function listedOrigins(state: ReadState<OriginsListing>): OriginsListed {
  if (state.kind !== 'ready') return { catalogs: NO_CATALOGS, owners: NO_OWNERS };
  const { catalogs, origins } = state.value;
  return {
    catalogs: catalogsIn(catalogs),
    owners:
      origins.kind === 'success'
        ? new Map(origins.origins.map((origin) => [origin.bookId, origin.catalogId]))
        : NO_OWNERS,
  };
}

export { catalogListOf, listedCatalogs, listedOrigins };
export type { CatalogListState, OriginsListed, OriginsListing };
