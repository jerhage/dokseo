import { MutationObserver } from '@tanstack/svelte-query';
import type {
  Accessor,
  CreateMutationOptions,
  DefaultError,
  QueryClient,
} from '@tanstack/svelte-query';
import type { WriteQuery } from '../write-query.svelte';
import { createTestQueryClient } from './query-client';

function writeQuery<R, V, C = unknown>(
  options: Accessor<CreateMutationOptions<R, DefaultError, V, C>>,
  client?: Accessor<QueryClient>,
): WriteQuery<R, V> {
  const observer = new MutationObserver(client?.() ?? createTestQueryClient(), options());

  return {
    state: { kind: 'idle' },
    submit: (variables) => {
      observer.mutate(variables).catch(() => undefined);
    },
    run: (variables) => observer.mutate(variables),
    reset: () => observer.reset(),
  };
}

export { writeQuery };
