import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { SyncStateStore } from '../domain/sync-state';

type SyncStatusResult =
  | {
      readonly kind: 'connected';
      readonly serverUrl: string;
      readonly deviceName: string;
      readonly lastSyncAt: number | null;
      readonly autoDownload: boolean;
    }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable;

type SyncStatusDeps = { readonly state: SyncStateStore };

async function syncStatus(deps: SyncStatusDeps): Promise<SyncStatusResult> {
  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  const { connection } = held;
  if (connection === null) return { kind: 'not-connected' };
  return {
    kind: 'connected',
    serverUrl: connection.serverUrl,
    deviceName: connection.deviceName,
    lastSyncAt: connection.lastSyncAt,
    autoDownload: connection.autoDownload,
  };
}

export { syncStatus };
export type { SyncStatusDeps, SyncStatusResult };
