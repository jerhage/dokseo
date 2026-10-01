import { createQuery } from '@tanstack/svelte-query';
import type {
  Accessor,
  CreateQueryOptions,
  DefaultError,
  QueryClient,
  QueryKey,
} from '@tanstack/svelte-query';
import { readStateOf } from './read-state';
import type { ReadState } from './read-state';

interface ReadQuery<T> {
  readonly state: ReadState<T>;
  reload(): void;
}

function readQuery<T, K extends QueryKey>(
  options: Accessor<CreateQueryOptions<T, DefaultError, T, K>>,
  client?: Accessor<QueryClient>,
): ReadQuery<T> {
  const query = createQuery(options, client);
  const state = $derived(readStateOf(query));

  return {
    get state() {
      return state;
    },
    reload() {
      void query.refetch();
    },
  };
}

export { readQuery };
export type { ReadQuery };
