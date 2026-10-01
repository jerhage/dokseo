import { match } from 'ts-pattern';

type Refresh =
  | { readonly kind: 'settled' }
  | { readonly kind: 'refreshing' }
  | { readonly kind: 'failed'; readonly message: string };

type ReadState<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly value: T; readonly refresh: Refresh };

const LOADING: ReadState<never> = { kind: 'loading' };

const SETTLED: Refresh = { kind: 'settled' };

const REFRESHING: Refresh = { kind: 'refreshing' };

function readFailed(message: string): ReadState<never> {
  return { kind: 'failed', message };
}

function readReady<T>(value: T): ReadState<T> {
  return { kind: 'ready', value, refresh: SETTLED };
}

function reloading<T>(state: ReadState<T>): ReadState<T> {
  return match(state)
    .with({ kind: 'loading' }, { kind: 'failed' }, (): ReadState<T> => LOADING)
    .with({ kind: 'ready' }, (ready): ReadState<T> => ({ ...ready, refresh: REFRESHING }))
    .exhaustive();
}

function reloadFailed<T>(state: ReadState<T>, message: string): ReadState<T> {
  return match(state)
    .with({ kind: 'loading' }, { kind: 'failed' }, (): ReadState<T> => readFailed(message))
    .with({ kind: 'ready' }, (ready): ReadState<T> => ({
      ...ready,
      refresh: { kind: 'failed', message },
    }))
    .exhaustive();
}

export { LOADING, readFailed, readReady, reloadFailed, reloading };
export type { ReadState, Refresh };
