import type { SyncConnection } from './sync-state';

type StoredConnection = { readonly [Field in keyof SyncConnection | 'id']?: unknown };

const CONNECTION_ROW = 'connection';

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function storedConnection(connection: SyncConnection): StoredConnection {
  return { id: CONNECTION_ROW, ...connection };
}

function connectionFromStored(stored: StoredConnection | undefined): SyncConnection | null {
  if (stored === undefined) return null;
  const { serverUrl, deviceId, deviceName, token, cursor, lastSyncAt } = stored;
  if (!isText(serverUrl) || !isText(deviceId) || !isText(deviceName) || !isText(token)) return null;
  if (!isCount(cursor)) return null;
  if (lastSyncAt !== null && !isCount(lastSyncAt)) return null;
  const { autoDownload } = stored;
  return {
    serverUrl,
    deviceId,
    deviceName,
    token,
    cursor,
    lastSyncAt,
    autoDownload: autoDownload === true,
  };
}

export { CONNECTION_ROW, connectionFromStored, storedConnection };
export type { StoredConnection };
