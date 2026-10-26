import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { PullPage, RejectionCode, ServerFailure, SyncServer } from '../domain/sync-server';
import type { SyncConnection, SyncStateStore } from '../domain/sync-state';
import { reduceToWinners } from '../domain/merge';
import type { ApplyDeps } from './apply-change';
import { openRound, reconcileChange } from './reconcile-change';

const PULL_PAGE_SIZE = 500;

type PullChangesResult =
  | {
      readonly kind: 'success';
      readonly applied: number;
      readonly held: number;
      readonly skipped: number;
    }
  | { readonly kind: 'not-connected' }
  | { readonly kind: 'rejected'; readonly code: RejectionCode; readonly record: null }
  | StorageUnavailable
  | Exclude<ServerFailure, { readonly kind: 'not-found' | 'rejected' }>;

type PullChangesDeps = ApplyDeps & {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

type Counts = { applied: number; held: number; skipped: number };

async function applyPage(
  deps: PullChangesDeps,
  deviceId: string,
  page: PullPage,
  counts: Counts,
): Promise<StorageUnavailable | null> {
  const opened = await openRound(deps, deviceId);
  if (opened.kind !== 'success') return opened;
  for (const change of reduceToWinners(page.changes)) {
    const reconciled = await reconcileChange(deps, opened.round, change);
    if (reconciled.kind === 'storage-unavailable') return reconciled;
    if (reconciled.kind === 'applied') counts.applied += 1;
    if (reconciled.kind === 'held') counts.held += 1;
    if (reconciled.kind === 'skipped') counts.skipped += 1;
  }
  return null;
}

function withCursor(connection: SyncConnection, cursor: number): SyncConnection {
  return { ...connection, cursor };
}

async function pullChanges(deps: PullChangesDeps): Promise<PullChangesResult> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  let { connection } = read;
  if (connection === null) return { kind: 'not-connected' };

  const counts: Counts = { applied: 0, held: 0, skipped: 0 };
  for (;;) {
    const pulled = await deps.server.pull(
      connection.serverUrl,
      connection.token,
      connection.cursor,
      PULL_PAGE_SIZE,
    );
    if (pulled.kind === 'rejected') return { kind: 'rejected', code: pulled.code, record: null };
    if (pulled.kind !== 'success') return pulled;
    const { page } = pulled;

    const failed = await applyPage(deps, connection.deviceId, page, counts);
    if (failed !== null) return failed;

    const advanced = page.next > connection.cursor;
    if (advanced) {
      connection = withCursor(connection, page.next);
      const saved = await deps.state.write(connection);
      if (saved.kind !== 'success') return saved;
    }
    if (!page.more) break;
    if (!advanced) return { kind: 'unreadable-response' };
  }
  return { kind: 'success', ...counts };
}

export { PULL_PAGE_SIZE, pullChanges };
export type { PullChangesDeps, PullChangesResult };
