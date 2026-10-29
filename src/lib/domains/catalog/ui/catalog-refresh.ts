import type { QueryClient } from '@tanstack/svelte-query';
import { catalogKeys } from '../queries/catalog-keys';

type CacheClient = Pick<QueryClient, 'invalidateQueries'>;

function refreshOrigins(client: CacheClient): Promise<void> {
  return client.invalidateQueries({ queryKey: catalogKeys.origins() });
}

async function refreshCatalogRecords(client: CacheClient): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: catalogKeys.catalogs() }),
    refreshOrigins(client),
  ]);
}

export { refreshCatalogRecords, refreshOrigins };
export type { CacheClient };
