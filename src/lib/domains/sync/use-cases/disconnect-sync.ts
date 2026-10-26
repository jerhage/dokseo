import { match } from 'ts-pattern';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { RevokeDeviceResult, SyncServer } from '../domain/sync-server';
import type { SyncStateStore } from '../domain/sync-state';

type UnrevokedReason =
  | 'offline'
  | 'unauthorized'
  | 'rate-limited'
  | 'server-error'
  | 'unreadable-response';

type DisconnectSyncResult =
  | { readonly kind: 'disconnected' }
  | { readonly kind: 'disconnected-unrevoked'; readonly reason: UnrevokedReason }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable;

type DisconnectSyncDeps = {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

type Disconnection = Extract<
  DisconnectSyncResult,
  { readonly kind: 'disconnected' | 'disconnected-unrevoked' }
>;

function disconnection(revoked: RevokeDeviceResult): Disconnection {
  return match(revoked)
    .with({ kind: 'success' }, { kind: 'not-found' }, (): Disconnection => ({
      kind: 'disconnected',
    }))
    .with(
      { kind: 'offline' },
      { kind: 'unauthorized' },
      { kind: 'rate-limited' },
      { kind: 'server-error' },
      { kind: 'unreadable-response' },
      (failure): Disconnection => ({ kind: 'disconnected-unrevoked', reason: failure.kind }),
    )
    .exhaustive();
}

async function disconnectSync(deps: DisconnectSyncDeps): Promise<DisconnectSyncResult> {
  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  const { connection } = held;
  if (connection === null) return { kind: 'not-connected' };

  const revoked = await deps.server.revokeDevice(
    connection.serverUrl,
    connection.token,
    connection.deviceId,
  );
  const outcome = disconnection(revoked);

  const cleared = await deps.state.clear();
  if (cleared.kind !== 'success') return cleared;
  return outcome;
}

export { disconnectSync };
export type { DisconnectSyncDeps, DisconnectSyncResult, UnrevokedReason };
