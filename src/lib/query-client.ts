import { QueryClient } from '@tanstack/svelte-query';

const GC_TIME_MS = 60 * 60 * 1000;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        networkMode: 'always',
      },
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}

export { createQueryClient };
