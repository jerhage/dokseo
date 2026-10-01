import { match } from 'ts-pattern';
import { failureMessage } from './query-failure';

type WriteState<R> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'done'; readonly result: R };

type WriteSnapshot<R> =
  | { readonly status: 'idle' }
  | { readonly status: 'pending' }
  | { readonly status: 'error'; readonly error: unknown }
  | { readonly status: 'success'; readonly data: R };

const IDLE: WriteState<never> = { kind: 'idle' };

const SAVING: WriteState<never> = { kind: 'saving' };

function writeStateOf<R>(snapshot: WriteSnapshot<R>): WriteState<R> {
  return match(snapshot)
    .with({ status: 'idle' }, (): WriteState<R> => IDLE)
    .with({ status: 'pending' }, (): WriteState<R> => SAVING)
    .with({ status: 'error' }, ({ error }): WriteState<R> => ({
      kind: 'failed',
      message: failureMessage(error),
    }))
    .with({ status: 'success' }, ({ data }): WriteState<R> => ({ kind: 'done', result: data }))
    .exhaustive();
}

export { IDLE, SAVING, writeStateOf };
export type { WriteSnapshot, WriteState };
