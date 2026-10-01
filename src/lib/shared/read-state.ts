type ReadState<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly value: T };

const LOADING: ReadState<never> = { kind: 'loading' };

function readFailed(message: string): ReadState<never> {
  return { kind: 'failed', message };
}

function readReady<T>(value: T): ReadState<T> {
  return { kind: 'ready', value };
}

export { LOADING, readFailed, readReady };
export type { ReadState };
