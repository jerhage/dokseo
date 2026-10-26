import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ServerFailure, SyncServer } from '../domain/sync-server';
import type { SyncStateStore } from '../domain/sync-state';

type RevokeSyncDeviceResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'own-device' }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable
  | Exclude<ServerFailure, { readonly kind: 'rejected' }>;

type RevokeSyncDeviceDeps = {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

async function revokeSyncDevice(
  deps: RevokeSyncDeviceDeps,
  deviceId: string,
): Promise<RevokeSyncDeviceResult> {
  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  const { connection } = held;
  if (connection === null) return { kind: 'not-connected' };
  if (connection.deviceId === deviceId) return { kind: 'own-device' };

  return deps.server.revokeDevice(connection.serverUrl, connection.token, deviceId);
}

export { revokeSyncDevice };
export type { RevokeSyncDeviceDeps, RevokeSyncDeviceResult };
