import type { QueryClient } from '@tanstack/svelte-query';
import { libraryKeys } from '../queries/library-keys';

function refreshLibrary(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: libraryKeys.all() });
}

export { refreshLibrary };
