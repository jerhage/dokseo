import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { SyncServer } from '../domain/sync-server';
import type { SyncConnection, SyncStateStore } from '../domain/sync-state';
import { connectSync } from './connect-sync';
import { disconnectSync } from './disconnect-sync';
import { revokeSyncDevice } from './revoke-sync-device';
import { syncDevices } from './sync-devices';
import { syncStatus } from './sync-status';

const URL_OF_SERVER = 'https://sync.example/sync/';

const CONNECTION: SyncConnection = {
  serverUrl: URL_OF_SERVER,
  deviceId: '00000000-0000-4000-8000-000000000002',
  deviceName: 'Phone',
  token: 'dsk_3f9a1c7e5b2d4a60',
  cursor: 5,
  lastSyncAt: 1772446000000,
};

const OTHER_DEVICE = '00000000-0000-4000-8000-000000000003';

function infoOf(apiVersions: readonly number[]) {
  return {
    kind: 'success',
    info: { server: 'dokseo-sync', version: '0.1.0', apiVersions },
  } as const;
}

function stateHolding(initial: SyncConnection | null) {
  let held = initial;
  const writes: SyncConnection[] = [];
  const state: SyncStateStore = {
    read: () => Promise.resolve({ kind: 'success', connection: held }),
    write: (connection) => {
      held = connection;
      writes.push(connection);
      return Promise.resolve({ kind: 'success' });
    },
    clear: () => {
      held = null;
      return Promise.resolve({ kind: 'success' });
    },
  };
  return { state, writes, held: () => held };
}

function refusing(): SyncServer {
  const refused = () => Promise.reject(new Error('the server must not be called'));
  return {
    info: refused,
    createDevice: refused,
    listDevices: refused,
    revokeDevice: refused,
    push: refused,
    pull: refused,
  };
}

function serverWith(overrides: Partial<SyncServer>): SyncServer {
  return { ...refusing(), ...overrides };
}

describe('connectSync', () => {
  it('stores the device, the token and a zero cursor, and never the password', async () => {
    const { state, writes } = stateHolding(null);
    const server = serverWith({
      info: () => Promise.resolve(infoOf([1])),
      createDevice: () =>
        Promise.resolve({
          kind: 'success',
          device: {
            deviceId: '00000000-0000-4000-8000-000000000002',
            token: 'dsk_3f9a1c7e5b2d4a60',
          },
        }),
    });

    const result = await connectSync(
      { server, state },
      ` ${URL_OF_SERVER} `,
      'reader',
      'hunter2',
      ' Phone ',
    );

    expect(result).toEqual({ kind: 'success', serverUrl: URL_OF_SERVER, deviceName: 'Phone' });
    expect(writes).toEqual([
      {
        serverUrl: URL_OF_SERVER,
        deviceId: '00000000-0000-4000-8000-000000000002',
        deviceName: 'Phone',
        token: 'dsk_3f9a1c7e5b2d4a60',
        cursor: 0,
        lastSyncAt: null,
      },
    ]);
    expect(JSON.stringify(writes)).not.toContain('hunter2');
  });

  it('answers incompatible-server when apiVersions lacks 1 and creates no device', async () => {
    const { state, writes } = stateHolding(null);
    const server = serverWith({ info: () => Promise.resolve(infoOf([2, 3])) });

    const result = await connectSync({ server, state }, URL_OF_SERVER, 'reader', 'pw', 'Phone');

    expect(result).toEqual({ kind: 'incompatible-server' });
    expect(writes).toEqual([]);
  });

  it('answers unauthorized for a wrong password and stores nothing', async () => {
    const { state, writes } = stateHolding(null);
    const server = serverWith({
      info: () => Promise.resolve(infoOf([1])),
      createDevice: () => Promise.resolve({ kind: 'unauthorized' }),
    });

    const result = await connectSync({ server, state }, URL_OF_SERVER, 'reader', 'wrong', 'Phone');

    expect(result).toEqual({ kind: 'unauthorized' });
    expect(writes).toEqual([]);
  });

  it('passes an unreachable server on as offline before asking for a device', async () => {
    const { state } = stateHolding(null);
    const server = serverWith({ info: () => Promise.resolve({ kind: 'offline' }) });

    expect(await connectSync({ server, state }, URL_OF_SERVER, 'r', 'p', 'Phone')).toEqual({
      kind: 'offline',
    });
  });

  it('answers invalid-url for text that is not an http or https address without calling the server', async () => {
    const { state } = stateHolding(null);

    expect(
      await connectSync({ server: refusing(), state }, 'not a url', 'r', 'p', 'Phone'),
    ).toEqual({
      kind: 'invalid-url',
    });
    expect(
      await connectSync({ server: refusing(), state }, 'ftp://x.example/', 'r', 'p', 'Phone'),
    ).toEqual({
      kind: 'invalid-url',
    });
  });

  it('answers already-connected without calling the server', async () => {
    const { state } = stateHolding(CONNECTION);

    expect(
      await connectSync({ server: refusing(), state }, URL_OF_SERVER, 'r', 'p', 'Phone'),
    ).toEqual({
      kind: 'already-connected',
    });
  });

  it('answers storage unavailable before any network call', async () => {
    const state: SyncStateStore = {
      read: () => Promise.resolve(STORAGE_UNAVAILABLE),
      write: () => Promise.resolve(STORAGE_UNAVAILABLE),
      clear: () => Promise.resolve(STORAGE_UNAVAILABLE),
    };

    expect(
      await connectSync({ server: refusing(), state }, URL_OF_SERVER, 'r', 'p', 'Phone'),
    ).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('disconnectSync', () => {
  it('revokes this device with its own token and clears the state', async () => {
    const { state, held } = stateHolding(CONNECTION);
    const revoked: string[][] = [];
    const server = serverWith({
      revokeDevice: (url, token, deviceId) => {
        revoked.push([url, token, deviceId]);
        return Promise.resolve({ kind: 'success' });
      },
    });

    expect(await disconnectSync({ server, state })).toEqual({ kind: 'disconnected' });
    expect(revoked).toEqual([[URL_OF_SERVER, CONNECTION.token, CONNECTION.deviceId]]);
    expect(held()).toBeNull();
  });

  it('clears the state and reports the reason when the server is offline', async () => {
    const { state, held } = stateHolding(CONNECTION);
    const server = serverWith({ revokeDevice: () => Promise.resolve({ kind: 'offline' }) });

    expect(await disconnectSync({ server, state })).toEqual({
      kind: 'disconnected-unrevoked',
      reason: 'offline',
    });
    expect(held()).toBeNull();
  });

  it('clears the state when the token was already revoked', async () => {
    const { state, held } = stateHolding(CONNECTION);
    const server = serverWith({ revokeDevice: () => Promise.resolve({ kind: 'unauthorized' }) });

    expect(await disconnectSync({ server, state })).toEqual({
      kind: 'disconnected-unrevoked',
      reason: 'unauthorized',
    });
    expect(held()).toBeNull();
  });

  it('counts a device the server no longer knows as revoked', async () => {
    const { state, held } = stateHolding(CONNECTION);
    const server = serverWith({ revokeDevice: () => Promise.resolve({ kind: 'not-found' }) });

    expect(await disconnectSync({ server, state })).toEqual({ kind: 'disconnected' });
    expect(held()).toBeNull();
  });

  it('answers not-connected without calling the server', async () => {
    const { state } = stateHolding(null);

    expect(await disconnectSync({ server: refusing(), state })).toEqual({ kind: 'not-connected' });
  });
});

describe('syncStatus', () => {
  it('reports not connected before connecting', async () => {
    const { state } = stateHolding(null);

    expect(await syncStatus({ state })).toEqual({ kind: 'not-connected' });
  });

  it('reports the server, the device name and the last sync once connected, never the token', async () => {
    const { state } = stateHolding(CONNECTION);

    const status = await syncStatus({ state });

    expect(status).toEqual({
      kind: 'connected',
      serverUrl: URL_OF_SERVER,
      deviceName: 'Phone',
      lastSyncAt: 1772446000000,
    });
    expect(JSON.stringify(status)).not.toContain(CONNECTION.token);
  });
});

describe('syncDevices', () => {
  it('lists the devices with this device marked by its id', async () => {
    const { state } = stateHolding(CONNECTION);
    const listed: string[][] = [];
    const server = serverWith({
      listDevices: (url, token) => {
        listed.push([url, token]);
        return Promise.resolve({
          kind: 'success',
          devices: [
            { deviceId: CONNECTION.deviceId, deviceName: 'Phone', createdAt: 1, lastSeenAt: 2 },
            { deviceId: OTHER_DEVICE, deviceName: 'Laptop', createdAt: 3, lastSeenAt: null },
          ],
        });
      },
    });

    const result = await syncDevices({ server, state });

    expect(listed).toEqual([[URL_OF_SERVER, CONNECTION.token]]);
    expect(result.kind === 'success' && result.thisDeviceId).toBe(CONNECTION.deviceId);
    expect(result.kind === 'success' && result.devices).toHaveLength(2);
  });

  it('answers not-connected without calling the server', async () => {
    const { state } = stateHolding(null);

    expect(await syncDevices({ server: refusing(), state })).toEqual({ kind: 'not-connected' });
  });

  it('passes an unauthorized answer on', async () => {
    const { state } = stateHolding(CONNECTION);
    const server = serverWith({ listDevices: () => Promise.resolve({ kind: 'unauthorized' }) });

    expect(await syncDevices({ server, state })).toEqual({ kind: 'unauthorized' });
  });
});

describe('revokeSyncDevice', () => {
  it('revokes another device with this device token', async () => {
    const { state } = stateHolding(CONNECTION);
    const revoked: string[][] = [];
    const server = serverWith({
      revokeDevice: (url, token, deviceId) => {
        revoked.push([url, token, deviceId]);
        return Promise.resolve({ kind: 'success' });
      },
    });

    expect(await revokeSyncDevice({ server, state }, OTHER_DEVICE)).toEqual({ kind: 'success' });
    expect(revoked).toEqual([[URL_OF_SERVER, CONNECTION.token, OTHER_DEVICE]]);
  });

  it('refuses to revoke this device, which disconnecting handles', async () => {
    const { state } = stateHolding(CONNECTION);

    expect(await revokeSyncDevice({ server: refusing(), state }, CONNECTION.deviceId)).toEqual({
      kind: 'own-device',
    });
  });

  it('passes a not-found answer on', async () => {
    const { state } = stateHolding(CONNECTION);
    const server = serverWith({ revokeDevice: () => Promise.resolve({ kind: 'not-found' }) });

    expect(await revokeSyncDevice({ server, state }, OTHER_DEVICE)).toEqual({ kind: 'not-found' });
  });

  it('answers not-connected without calling the server', async () => {
    const { state } = stateHolding(null);

    expect(await revokeSyncDevice({ server: refusing(), state }, OTHER_DEVICE)).toEqual({
      kind: 'not-connected',
    });
  });
});
