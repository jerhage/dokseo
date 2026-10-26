import { createSyncStateStore } from '../domains/sync/adapters/indexeddb-sync-state';
import type { SyncServer } from '../domains/sync/domain/sync-server';
import { connectSync } from '../domains/sync/use-cases/connect-sync';
import type { ConnectSyncResult } from '../domains/sync/use-cases/connect-sync';
import { disconnectSync } from '../domains/sync/use-cases/disconnect-sync';
import type { DisconnectSyncResult } from '../domains/sync/use-cases/disconnect-sync';
import { revokeSyncDevice } from '../domains/sync/use-cases/revoke-sync-device';
import type { RevokeSyncDeviceResult } from '../domains/sync/use-cases/revoke-sync-device';
import { syncDevices } from '../domains/sync/use-cases/sync-devices';
import type { SyncDevicesResult } from '../domains/sync/use-cases/sync-devices';
import { syncStatus } from '../domains/sync/use-cases/sync-status';
import type { SyncStatusResult } from '../domains/sync/use-cases/sync-status';

type SyncUseCases = {
  readonly connectSync: (
    serverUrl: string,
    username: string,
    password: string,
    deviceName: string,
  ) => Promise<ConnectSyncResult>;
  readonly disconnectSync: () => Promise<DisconnectSyncResult>;
  readonly syncDevices: () => Promise<SyncDevicesResult>;
  readonly revokeSyncDevice: (deviceId: string) => Promise<RevokeSyncDeviceResult>;
  readonly syncStatus: () => Promise<SyncStatusResult>;
};

let server: Promise<SyncServer> | null = null;

function loadSyncServer(): Promise<SyncServer> {
  if (server !== null) return server;
  const loading = import('../domains/sync/adapters/http-sync-server')
    .then(
      ({ HttpSyncServer }): SyncServer =>
        new HttpSyncServer((url, init) => globalThis.fetch(url, init)),
    )
    .catch((cause: unknown): never => {
      server = null;
      throw cause;
    });
  server = loading;
  return loading;
}

function buildSync(): SyncUseCases {
  const state = createSyncStateStore();
  const remote: SyncServer = {
    info: async (url) => (await loadSyncServer()).info(url),
    createDevice: async (url, request) => (await loadSyncServer()).createDevice(url, request),
    listDevices: async (url, token) => (await loadSyncServer()).listDevices(url, token),
    revokeDevice: async (url, token, deviceId) =>
      (await loadSyncServer()).revokeDevice(url, token, deviceId),
    push: async (url, token, changes) => (await loadSyncServer()).push(url, token, changes),
    pull: async (url, token, after, limit) =>
      (await loadSyncServer()).pull(url, token, after, limit),
  };
  const deps = { server: remote, state };

  return {
    connectSync: (serverUrl, username, password, deviceName) =>
      connectSync(deps, serverUrl, username, password, deviceName),
    disconnectSync: () => disconnectSync(deps),
    syncDevices: () => syncDevices(deps),
    revokeSyncDevice: (deviceId) => revokeSyncDevice(deps, deviceId),
    syncStatus: () => syncStatus({ state }),
  };
}

export { buildSync };
export type { SyncUseCases };
