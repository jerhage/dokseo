import type { WriteQuery } from '../write-query.svelte';

const NOT_RUN = new Error('The write runs only inside a component');

const askedWrites: unknown[] = [];

function writeQuery<R, V>(): WriteQuery<R, V> {
  return {
    state: { kind: 'idle' },
    submit: () => undefined,
    run: (variables) => {
      askedWrites.push(variables);
      return Promise.reject(NOT_RUN);
    },
    reset: () => undefined,
  };
}

export { askedWrites, writeQuery };
