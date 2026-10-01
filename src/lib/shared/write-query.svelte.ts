import { createMutation } from '@tanstack/svelte-query';
import type {
  Accessor,
  CreateMutationOptions,
  DefaultError,
  QueryClient,
} from '@tanstack/svelte-query';
import { writeStateOf } from './write-state';
import type { WriteState } from './write-state';

interface WriteQuery<R, V> {
  readonly state: WriteState<R>;
  submit(variables: V): void;
  reset(): void;
}

function writeQuery<R, V>(
  options: Accessor<CreateMutationOptions<R, DefaultError, V>>,
  client?: Accessor<QueryClient>,
): WriteQuery<R, V> {
  const mutation = createMutation(options, client);
  const state = $derived(writeStateOf(mutation));

  return {
    get state() {
      return state;
    },
    submit(variables) {
      mutation.mutate(variables);
    },
    reset() {
      mutation.reset();
    },
  };
}

export { writeQuery };
export type { WriteQuery };
