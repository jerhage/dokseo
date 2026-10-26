import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { applyHeldChanges } from './apply-held-changes';
import type { ApplyHeldChangesDeps, ApplyHeldChangesResult } from './apply-held-changes';
import { fetchRemoteBook } from './download-remote-book';
import type { DownloadChoices, FetchRemoteBookDeps } from './download-remote-book';
import { listRemoteBooks } from './list-remote-books';
import type { ListRemoteBooksDeps } from './list-remote-books';
import { pullChanges } from './pull-changes';
import type { PullChangesDeps } from './pull-changes';
import { pushChanges } from './push-changes';
import type { PushChangesDeps, PushChangesResult } from './push-changes';

type SyncNowFailure = Exclude<PushChangesResult, { readonly kind: 'success' }>;

type SyncNowResult =
  | {
      readonly kind: 'success';
      readonly pushed: number;
      readonly waiting: number;
      readonly applied: number;
      readonly held: number;
      readonly skipped: number;
      readonly downloaded: number;
      readonly downloadFailed: number;
    }
  | SyncNowFailure;

type SyncNowDeps = PushChangesDeps &
  PullChangesDeps &
  ApplyHeldChangesDeps &
  ListRemoteBooksDeps &
  FetchRemoteBookDeps & { readonly now: () => number };

type AutoDownload =
  | { readonly kind: 'success'; readonly downloaded: number; readonly downloadFailed: number }
  | StorageUnavailable;

const NO_PROGRESS = (): void => undefined;

async function recordSyncTime(deps: SyncNowDeps): Promise<StorageUnavailable | null> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  if (read.connection === null) return null;
  const saved = await deps.state.write({ ...read.connection, lastSyncAt: deps.now() });
  return saved.kind === 'success' ? null : saved;
}

async function autoDownload(deps: SyncNowDeps, choices: DownloadChoices): Promise<AutoDownload> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  if (read.connection === null || !read.connection.autoDownload) {
    return { kind: 'success', downloaded: 0, downloadFailed: 0 };
  }
  const listed = await listRemoteBooks(deps);
  if (listed.kind === 'not-connected') return { kind: 'success', downloaded: 0, downloadFailed: 0 };
  if (listed.kind !== 'success') return listed;

  let downloaded = 0;
  let downloadFailed = 0;
  for (const book of listed.books) {
    if (book.availability.kind !== 'downloadable' || book.fileDiffers) continue;
    const fetched = await fetchRemoteBook(deps, book, choices, NO_PROGRESS);
    if (fetched.kind === 'success') downloaded += 1;
    else downloadFailed += 1;
  }
  return { kind: 'success', downloaded, downloadFailed };
}

async function attachDownloaded(
  deps: SyncNowDeps,
  settled: Extract<ApplyHeldChangesResult, { readonly kind: 'success' }>,
  downloads: Extract<AutoDownload, { readonly kind: 'success' }>,
): Promise<ApplyHeldChangesResult> {
  if (downloads.downloaded === 0) return { ...settled, applied: 0, skipped: 0 };
  return applyHeldChanges(deps);
}

async function syncNow(deps: SyncNowDeps, choices: DownloadChoices): Promise<SyncNowResult> {
  const pushed = await pushChanges(deps);
  if (pushed.kind !== 'success') return pushed;

  const retried = await applyHeldChanges(deps);
  if (retried.kind !== 'success') return retried;

  const pulled = await pullChanges(deps);
  if (pulled.kind !== 'success') return pulled;

  const settled = await applyHeldChanges(deps);
  if (settled.kind !== 'success') return settled;

  const downloads = await autoDownload(deps, choices);
  if (downloads.kind !== 'success') return downloads;

  const attached = await attachDownloaded(deps, settled, downloads);
  if (attached.kind !== 'success') return attached;

  const failed = await recordSyncTime(deps);
  if (failed !== null) return failed;

  return {
    kind: 'success',
    pushed: pushed.pushed,
    waiting: pushed.waiting,
    applied: pulled.applied + retried.applied + settled.applied + attached.applied,
    held: attached.held,
    skipped: pulled.skipped + retried.skipped + settled.skipped + attached.skipped,
    downloaded: downloads.downloaded,
    downloadFailed: downloads.downloadFailed,
  };
}

export { syncNow };
export type { SyncNowDeps, SyncNowResult };
