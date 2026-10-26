import { createCatalogOriginsRepository } from '../domains/catalog/adapters/indexeddb-catalog-origins.repo';
import { createLibraryRepository } from '../domains/library/adapters/indexeddb-opfs-library.repo';
import type { LibraryRepository } from '../domains/library/domain/book/library-repository';
import { createTagRepository } from '../domains/recognition/adapters/tag/indexeddb-tags.repo';
import { createCaptureRepository } from '../domains/recognition/adapters/capture/indexeddb-captures.repo';
import type { CaptureRepository } from '../domains/recognition/domain/capture/capture-repository';
import { createHeldChangeStore } from '../domains/sync/adapters/indexeddb-held-changes';
import { createSyncStateStore } from '../domains/sync/adapters/indexeddb-sync-state';
import type { SyncServer } from '../domains/sync/domain/sync-server';
import { applyHeldChanges } from '../domains/sync/use-cases/apply-held-changes';
import type { ApplyHeldChangesResult } from '../domains/sync/use-cases/apply-held-changes';
import { connectSync } from '../domains/sync/use-cases/connect-sync';
import type { ConnectSyncResult } from '../domains/sync/use-cases/connect-sync';
import { disconnectSync } from '../domains/sync/use-cases/disconnect-sync';
import type { DisconnectSyncResult } from '../domains/sync/use-cases/disconnect-sync';
import { pullChanges } from '../domains/sync/use-cases/pull-changes';
import type { PullChangesResult } from '../domains/sync/use-cases/pull-changes';
import { pushChanges } from '../domains/sync/use-cases/push-changes';
import type { PushChangesResult } from '../domains/sync/use-cases/push-changes';
import { revokeSyncDevice } from '../domains/sync/use-cases/revoke-sync-device';
import type { RevokeSyncDeviceResult } from '../domains/sync/use-cases/revoke-sync-device';
import { syncDevices } from '../domains/sync/use-cases/sync-devices';
import type { SyncDevicesResult } from '../domains/sync/use-cases/sync-devices';
import { syncNow } from '../domains/sync/use-cases/sync-now';
import type { SyncNowResult } from '../domains/sync/use-cases/sync-now';
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
  readonly pushChanges: () => Promise<PushChangesResult>;
  readonly pullChanges: () => Promise<PullChangesResult>;
  readonly applyHeldChanges: () => Promise<ApplyHeldChangesResult>;
  readonly syncNow: () => Promise<SyncNowResult>;
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

function buildSync(shelf: LibraryRepository, captures: CaptureRepository): SyncUseCases {
  const state = createSyncStateStore();
  const catalogs = createCatalogOriginsRepository();
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
  const tags = createTagRepository();
  const holdings = {
    ...deps,
    shelf: { repository: shelf },
    origins: { origins: catalogs },
    captures: { captures },
    tags: { tags },
    catalogs: { catalogs },
  };
  const unmarkedCatalogs = createCatalogOriginsRepository('unmarked');
  const applying = {
    ...deps,
    shelf: { repository: createLibraryRepository('unmarked'), now: Date.now },
    captures: { captures: createCaptureRepository('unmarked') },
    catalogs: { catalogs: unmarkedCatalogs },
    held: createHeldChangeStore(),
  };
  const everything = {
    ...applying,
    origins: { origins: unmarkedCatalogs },
    tags: { tags },
    now: Date.now,
  };

  return {
    connectSync: (serverUrl, username, password, deviceName) =>
      connectSync(deps, serverUrl, username, password, deviceName),
    disconnectSync: () => disconnectSync(deps),
    syncDevices: () => syncDevices(deps),
    revokeSyncDevice: (deviceId) => revokeSyncDevice(deps, deviceId),
    syncStatus: () => syncStatus({ state }),
    pushChanges: () => pushChanges(holdings),
    pullChanges: () => pullChanges(applying),
    applyHeldChanges: () => applyHeldChanges(applying),
    syncNow: () => syncNow(everything),
  };
}

export { buildSync };
export type { SyncUseCases };
