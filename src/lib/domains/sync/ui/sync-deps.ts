import type { SyncReads } from '../queries/sync-queries';
import type { ConnectSyncResult } from '../use-cases/connect-sync';
import type { DisconnectSyncResult } from '../use-cases/disconnect-sync';
import type { RevokeSyncDeviceResult } from '../use-cases/revoke-sync-device';
import type { SyncNowResult } from '../use-cases/sync-now';

type ConnectSync = (
  serverUrl: string,
  username: string,
  password: string,
  deviceName: string,
) => Promise<ConnectSyncResult>;

type SyncSettingsUseCases = SyncReads & {
  readonly connectSync: ConnectSync;
  readonly disconnectSync: () => Promise<DisconnectSyncResult>;
  readonly revokeSyncDevice: (deviceId: string) => Promise<RevokeSyncDeviceResult>;
  readonly syncNow: () => Promise<SyncNowResult>;
};

export type { ConnectSync, SyncSettingsUseCases };
