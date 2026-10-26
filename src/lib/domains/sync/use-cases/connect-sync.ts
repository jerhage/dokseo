import type { ServerFailure, SyncServer } from '../domain/sync-server';
import type { SyncStateStore } from '../domain/sync-state';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type ConnectSyncResult =
  | { readonly kind: 'success'; readonly serverUrl: string; readonly deviceName: string }
  | { readonly kind: 'invalid-url' }
  | { readonly kind: 'already-connected' }
  | { readonly kind: 'incompatible-server' }
  | StorageUnavailable
  | Exclude<ServerFailure, { readonly kind: 'not-found' }>;

type ConnectSyncDeps = {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

const SUPPORTED_API_VERSION = 1;

function isServerUrl(text: string): boolean {
  if (!URL.canParse(text)) return false;
  const { protocol } = new URL(text);
  return protocol === 'https:' || protocol === 'http:';
}

async function connectSync(
  deps: ConnectSyncDeps,
  serverUrl: string,
  username: string,
  password: string,
  deviceName: string,
): Promise<ConnectSyncResult> {
  const url = serverUrl.trim();
  const name = deviceName.trim();
  if (!isServerUrl(url)) return { kind: 'invalid-url' };

  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  if (held.connection !== null) return { kind: 'already-connected' };

  const info = await deps.server.info(url);
  if (info.kind !== 'success') return info;
  if (!info.info.apiVersions.includes(SUPPORTED_API_VERSION)) {
    return { kind: 'incompatible-server' };
  }

  const created = await deps.server.createDevice(url, { username, password, deviceName: name });
  if (created.kind !== 'success') return created;

  const written = await deps.state.write({
    serverUrl: url,
    deviceId: created.device.deviceId,
    deviceName: name,
    token: created.device.token,
    cursor: 0,
    lastSyncAt: null,
  });
  if (written.kind !== 'success') return written;
  return { kind: 'success', serverUrl: url, deviceName: name };
}

export { connectSync };
export type { ConnectSyncDeps, ConnectSyncResult };
