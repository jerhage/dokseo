import { match } from 'ts-pattern';
import type { ReadState } from '$lib/shared/read-state';
import type { SyncStatusResult } from '../use-cases/sync-status';

type Connection = Extract<SyncStatusResult, { readonly kind: 'connected' }>;

type SyncView =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'not-connected' }
  | { readonly kind: 'connected'; readonly connection: Connection };

function syncView(state: ReadState<SyncStatusResult>): SyncView {
  return match(state)
    .returnType<SyncView>()
    .with({ kind: 'loading' }, () => ({ kind: 'loading' }))
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () => ({
      kind: 'storage-unavailable',
    }))
    .with({ kind: 'ready', value: { kind: 'not-connected' } }, () => ({ kind: 'not-connected' }))
    .with({ kind: 'ready', value: { kind: 'connected' } }, ({ value }) => ({
      kind: 'connected',
      connection: value,
    }))
    .exhaustive();
}

export { syncView };
export type { Connection, SyncView };
