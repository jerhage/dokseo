import type { WriteQuery } from '../write-query.svelte';

function writeQuery<R, V>(): WriteQuery<R, V> {
  return {
    state: { kind: 'idle' },
    submit: () => undefined,
    run: () => new Promise<R>(() => undefined),
    reset: () => undefined,
  };
}

export { writeQuery };
