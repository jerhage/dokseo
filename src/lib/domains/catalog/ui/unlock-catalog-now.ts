import type { QueryClient } from '@tanstack/svelte-query';
import type { CatalogId } from '$lib/shared/ids';
import { catalogKeys } from '../queries/catalog-keys';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';

type UnlockCatalogNowCases = {
  readonly unlockCatalog: (
    id: CatalogId,
    password: string,
    remember: boolean,
  ) => Promise<UnlockCatalogResult>;
};

function unlockCatalogNow(
  cases: UnlockCatalogNowCases,
  client: Pick<QueryClient, 'invalidateQueries'>,
  id: CatalogId,
  password: string,
  remember: boolean,
): Promise<UnlockCatalogResult> {
  const unlocked = cases.unlockCatalog(id, password, remember);
  return unlocked.finally(() =>
    client.invalidateQueries({ queryKey: catalogKeys.rememberedPasswords() }),
  );
}

export { unlockCatalogNow };
export type { UnlockCatalogNowCases };
