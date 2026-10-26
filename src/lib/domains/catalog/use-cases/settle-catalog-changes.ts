import type { SettledMarker } from '$lib/shared/change-marker';
import type { CatalogRepository, CatalogWrite } from '../domain/catalog-repository';

type SettleCatalogChangesResult = CatalogWrite;

type SettleCatalogChangesDeps = { readonly catalogs: CatalogRepository };

function settleCatalogChanges(
  deps: SettleCatalogChangesDeps,
  settled: readonly SettledMarker[],
): Promise<SettleCatalogChangesResult> {
  return deps.catalogs.settleChanges(settled);
}

export { settleCatalogChanges };
export type { SettleCatalogChangesDeps, SettleCatalogChangesResult };
