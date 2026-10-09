import type { QueryClient } from '@tanstack/svelte-query';
import { catalogKeys } from '../queries/catalog-keys';

function refreshOrigins(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: catalogKeys.origins() });
}

export { refreshOrigins };
