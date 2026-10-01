import { match, P } from 'ts-pattern';
import { failureMessage } from './query-failure';

type ReadState<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly value: T };

type ReadSnapshot<T> =
  | { readonly status: 'pending' }
  | { readonly status: 'error'; readonly isLoadingError: true; readonly error: unknown }
  | { readonly status: 'error'; readonly isLoadingError: false; readonly data: T }
  | { readonly status: 'success'; readonly data: T };

const LOADING: ReadState<never> = { kind: 'loading' };

function readFailed(message: string): ReadState<never> {
  return { kind: 'failed', message };
}

function readReady<T>(value: T): ReadState<T> {
  return { kind: 'ready', value };
}

function readStateOf<T>(snapshot: ReadSnapshot<T>): ReadState<T> {
  return match(snapshot)
    .with({ status: 'pending' }, (): ReadState<T> => LOADING)
    .with({ status: 'error', isLoadingError: true }, ({ error }): ReadState<T> =>
      readFailed(failureMessage(error)),
    )
    .with({ status: 'error', isLoadingError: false }, ({ data }) => readReady(data))
    .with({ status: 'success' }, ({ data }) => readReady(data))
    .exhaustive();
}

function readBoth<A, B, T>(
  first: ReadState<A>,
  second: ReadState<B>,
  join: (first: A, second: B) => T,
): ReadState<T> {
  return match<readonly [ReadState<A>, ReadState<B>], ReadState<T>>([first, second])
    .with([{ kind: 'failed' }, P._], ([failed]) => failed)
    .with([P._, { kind: 'failed' }], ([, failed]) => failed)
    .with([{ kind: 'loading' }, P._], [P._, { kind: 'loading' }], () => LOADING)
    .with([{ kind: 'ready' }, { kind: 'ready' }], ([one, two]) =>
      readReady(join(one.value, two.value)),
    )
    .exhaustive();
}

export { LOADING, readBoth, readFailed, readReady, readStateOf };
export type { ReadSnapshot, ReadState };
