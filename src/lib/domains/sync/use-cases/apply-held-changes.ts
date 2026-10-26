import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { SyncStateStore } from '../domain/sync-state';
import type { ApplyDeps } from './apply-change';
import { openRound, reconcileChange, releaseHeld } from './reconcile-change';

type ApplyHeldChangesResult =
  | {
      readonly kind: 'success';
      readonly applied: number;
      readonly held: number;
      readonly skipped: number;
    }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable;

type ApplyHeldChangesDeps = ApplyDeps & { readonly state: SyncStateStore };

async function applyHeldChanges(deps: ApplyHeldChangesDeps): Promise<ApplyHeldChangesResult> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  const { connection } = read;
  if (connection === null) return { kind: 'not-connected' };

  const opened = await openRound(deps, connection.deviceId);
  if (opened.kind !== 'success') return opened;
  const { round } = opened;

  let applied = 0;
  let held = 0;
  let skipped = 0;
  for (const change of round.held.values()) {
    const reconciled = await reconcileChange(deps, round, change);
    if (reconciled.kind === 'storage-unavailable') return reconciled;
    if (reconciled.kind === 'applied') applied += 1;
    if (reconciled.kind === 'held') held += 1;
    if (reconciled.kind === 'skipped' || reconciled.kind === 'ignored') {
      if (reconciled.kind === 'skipped') skipped += 1;
      const released = await releaseHeld(deps, round, change);
      if (released !== null) return released;
    }
  }
  return { kind: 'success', applied, held, skipped };
}

export { applyHeldChanges };
export type { ApplyHeldChangesDeps, ApplyHeldChangesResult };
