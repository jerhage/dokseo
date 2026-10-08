import { match } from 'ts-pattern';
import type { CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';

type OriginFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'files' }
  | { readonly kind: 'catalog'; readonly catalogId: CatalogId };

type OriginFilterOption = { readonly value: string; readonly label: string };

const ALL_FILTER: OriginFilter = { kind: 'all' };

const FILES_FILTER: OriginFilter = { kind: 'files' };

const FILTER_LABEL = 'Source';

const ALL_LABEL = 'All';

const FILES_LABEL = 'Added from files';

const CATALOG_VALUE_PREFIX = 'catalog:';

function filterValue(filter: OriginFilter): string {
  return match(filter)
    .with({ kind: 'all' }, () => 'all')
    .with({ kind: 'files' }, () => 'files')
    .with({ kind: 'catalog' }, (chosen) => `${CATALOG_VALUE_PREFIX}${chosen.catalogId}`)
    .exhaustive();
}

function filterOptions(catalogs: readonly Catalog[]): readonly OriginFilterOption[] {
  return [
    { value: filterValue(ALL_FILTER), label: ALL_LABEL },
    { value: filterValue(FILES_FILTER), label: FILES_LABEL },
    ...catalogs.map((catalog) => ({
      value: filterValue({ kind: 'catalog', catalogId: catalog.id }),
      label: `Downloaded from ${catalog.title}`,
    })),
  ];
}

function sourceText(catalog: string | null): string {
  return catalog === null ? FILES_LABEL : `Downloaded from ${catalog}`;
}

function parsedFilter(value: string, catalogs: readonly Catalog[]): OriginFilter {
  if (value === filterValue(FILES_FILTER)) return FILES_FILTER;
  const catalog = catalogs.find(
    (candidate) => value === filterValue({ kind: 'catalog', catalogId: candidate.id }),
  );
  return catalog === undefined ? ALL_FILTER : { kind: 'catalog', catalogId: catalog.id };
}

function shownFilter(filter: OriginFilter, catalogs: readonly Catalog[]): OriginFilter {
  if (filter.kind !== 'catalog') return filter;
  return catalogs.some((catalog) => catalog.id === filter.catalogId) ? filter : ALL_FILTER;
}

function matchesFilter(filter: OriginFilter, owner: CatalogId | null): boolean {
  return match(filter)
    .with({ kind: 'all' }, () => true)
    .with({ kind: 'files' }, () => owner === null)
    .with({ kind: 'catalog' }, (chosen) => owner === chosen.catalogId)
    .exhaustive();
}

export {
  ALL_FILTER,
  FILES_LABEL,
  FILTER_LABEL,
  filterOptions,
  filterValue,
  matchesFilter,
  parsedFilter,
  shownFilter,
  sourceText,
};
export type { OriginFilter, OriginFilterOption };
