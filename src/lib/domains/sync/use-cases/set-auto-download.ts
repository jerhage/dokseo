import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { SyncStateStore } from '../domain/sync-state';

type SetAutoDownloadResult =
  | { readonly kind: 'success'; readonly autoDownload: boolean }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable;

type SetAutoDownloadDeps = { readonly state: SyncStateStore };

async function setAutoDownload(
  deps: SetAutoDownloadDeps,
  autoDownload: boolean,
): Promise<SetAutoDownloadResult> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  const { connection } = read;
  if (connection === null) return { kind: 'not-connected' };
  const written = await deps.state.write({ ...connection, autoDownload });
  if (written.kind !== 'success') return written;
  return { kind: 'success', autoDownload };
}

export { setAutoDownload };
export type { SetAutoDownloadDeps, SetAutoDownloadResult };
