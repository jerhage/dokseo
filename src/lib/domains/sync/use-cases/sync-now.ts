import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { applyHeldChanges } from './apply-held-changes';
import type { ApplyHeldChangesDeps } from './apply-held-changes';
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
    }
  | SyncNowFailure;

type SyncNowDeps = PushChangesDeps &
  PullChangesDeps &
  ApplyHeldChangesDeps & { readonly now: () => number };

async function recordSyncTime(deps: SyncNowDeps): Promise<StorageUnavailable | null> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  if (read.connection === null) return null;
  const saved = await deps.state.write({ ...read.connection, lastSyncAt: deps.now() });
  return saved.kind === 'success' ? null : saved;
}

async function syncNow(deps: SyncNowDeps): Promise<SyncNowResult> {
  const pushed = await pushChanges(deps);
  if (pushed.kind !== 'success') return pushed;

  const retried = await applyHeldChanges(deps);
  if (retried.kind !== 'success') return retried;

  const pulled = await pullChanges(deps);
  if (pulled.kind !== 'success') return pulled;

  const settled = await applyHeldChanges(deps);
  if (settled.kind !== 'success') return settled;

  const failed = await recordSyncTime(deps);
  if (failed !== null) return failed;

  return {
    kind: 'success',
    pushed: pushed.pushed,
    waiting: pushed.waiting,
    applied: pulled.applied + retried.applied + settled.applied,
    held: settled.held,
    skipped: pulled.skipped + retried.skipped + settled.skipped,
  };
}

export { syncNow };
export type { SyncNowDeps, SyncNowResult };
