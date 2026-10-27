import type { DownloadProgress } from '$lib/domains/catalog/domain/catalog-source';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { SyncReads } from '../queries/sync-queries';
import type { ConnectSyncResult } from '../use-cases/connect-sync';
import type { DownloadChoices, DownloadRemoteBookResult } from '../use-cases/download-remote-book';
import type { DisconnectSyncResult } from '../use-cases/disconnect-sync';
import type { RevokeSyncDeviceResult } from '../use-cases/revoke-sync-device';
import type { SetAutoDownloadResult } from '../use-cases/set-auto-download';
import type { SyncNowResult } from '../use-cases/sync-now';

type ConnectSync = (
  serverUrl: string,
  username: string,
  password: string,
  deviceName: string,
) => Promise<ConnectSyncResult>;

type DownloadChoiceSource = {
  readonly matching: () => BookMatching;
  readonly defaults: () => ReadingDefaults;
};

type RemoteBooksUseCases = Pick<SyncReads, 'remoteBooks'> & {
  readonly downloadRemoteBook: (
    contentHash: string,
    choices: DownloadChoices,
    onProgress: DownloadProgress,
  ) => Promise<DownloadRemoteBookResult>;
};

type SyncSettingsUseCases = SyncReads & {
  readonly connectSync: ConnectSync;
  readonly disconnectSync: () => Promise<DisconnectSyncResult>;
  readonly revokeSyncDevice: (deviceId: string) => Promise<RevokeSyncDeviceResult>;
  readonly syncNow: (choices: DownloadChoices) => Promise<SyncNowResult>;
  readonly setAutoDownload: (autoDownload: boolean) => Promise<SetAutoDownloadResult>;
};

type BackgroundSyncUseCases = Pick<SyncReads, 'syncStatus'> & {
  readonly syncNowIfFree: (choices: DownloadChoices) => Promise<SyncNowResult | null>;
};

export type {
  BackgroundSyncUseCases,
  ConnectSync,
  DownloadChoiceSource,
  RemoteBooksUseCases,
  SyncSettingsUseCases,
};
