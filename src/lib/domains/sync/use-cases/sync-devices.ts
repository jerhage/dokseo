import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { DeviceSummary, ServerFailure, SyncServer } from '../domain/sync-server';
import type { SyncStateStore } from '../domain/sync-state';

type SyncDevicesResult =
  | {
      readonly kind: 'success';
      readonly devices: readonly DeviceSummary[];
      readonly thisDeviceId: string;
    }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable
  | Exclude<ServerFailure, { readonly kind: 'not-found' | 'rejected' }>;

type SyncDevicesDeps = {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

async function syncDevices(deps: SyncDevicesDeps): Promise<SyncDevicesResult> {
  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  const { connection } = held;
  if (connection === null) return { kind: 'not-connected' };

  const listed = await deps.server.listDevices(connection.serverUrl, connection.token);
  if (listed.kind !== 'success') return listed;
  return { kind: 'success', devices: listed.devices, thisDeviceId: connection.deviceId };
}

export { syncDevices };
export type { SyncDevicesDeps, SyncDevicesResult };
