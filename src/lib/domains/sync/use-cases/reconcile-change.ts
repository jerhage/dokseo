import { match } from 'ts-pattern';
import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Change } from '../domain/change';
import { localChange } from '../domain/local-change';
import { decideMerge } from '../domain/merge';
import { applyChange } from './apply-change';
import type { ApplyDeps, ApplyOutcome, BooksByHash } from './apply-change';
import { readLocalStates, sideOf, stateKey } from './read-local-states';
import type { LocalStates } from './read-local-states';

type Round = {
  readonly deviceId: string;
  readonly states: LocalStates;
  readonly books: BooksByHash;
  readonly held: Map<string, Change>;
};

type RoundOpened = { readonly kind: 'success'; readonly round: Round } | StorageUnavailable;

type Reconciliation =
  | { readonly kind: 'applied' }
  | { readonly kind: 'held' }
  | { readonly kind: 'skipped' }
  | { readonly kind: 'ignored' }
  | StorageUnavailable;

async function openRound(deps: ApplyDeps, deviceId: string): Promise<RoundOpened> {
  const states = await readLocalStates(deps);
  if (states.kind !== 'success') return states;
  const listed = await listBooks(deps.shelf);
  if (listed.kind !== 'success') return listed;
  const held = await deps.held.list();
  if (held.kind !== 'success') return held;
  return {
    kind: 'success',
    round: {
      deviceId,
      states: states.states,
      books: new Map(listed.books.map((book) => [book.contentHash, book])),
      held: new Map(held.changes.map((change) => [stateKey(change.kind, change.recordId), change])),
    },
  };
}

async function holdChange(deps: ApplyDeps, round: Round, change: Change): Promise<Reconciliation> {
  const key = stateKey(change.kind, change.recordId);
  const existing = round.held.get(key);
  if (existing !== undefined && decideMerge(existing, change).kind !== 'apply') {
    return { kind: 'held' };
  }
  const stored = await deps.held.put(change);
  if (stored.kind !== 'success') return stored;
  round.held.set(key, change);
  return { kind: 'held' };
}

async function releaseHeld(
  deps: ApplyDeps,
  round: Round,
  change: Change,
): Promise<StorageUnavailable | null> {
  const key = stateKey(change.kind, change.recordId);
  if (!round.held.has(key)) return null;
  const removed = await deps.held.remove(change.kind, change.recordId);
  if (removed.kind !== 'success') return removed;
  round.held.delete(key);
  return null;
}

async function settleOutcome(
  deps: ApplyDeps,
  round: Round,
  change: Change,
  outcome: ApplyOutcome,
): Promise<Reconciliation> {
  return match(outcome)
    .returnType<Promise<Reconciliation>>()
    .with({ kind: 'applied' }, async () => {
      const failed = await releaseHeld(deps, round, change);
      return failed ?? { kind: 'applied' };
    })
    .with({ kind: 'not-ready' }, () => holdChange(deps, round, change))
    .with({ kind: 'unreadable' }, () => Promise.resolve({ kind: 'skipped' } as const))
    .with({ kind: 'storage-unavailable' }, (unavailable) => Promise.resolve(unavailable))
    .exhaustive();
}

async function reconcileChange(
  deps: ApplyDeps,
  round: Round,
  change: Change,
): Promise<Reconciliation> {
  const side = sideOf(round.states, change.kind, change.recordId);
  const decision = decideMerge(localChange(side, change, round.deviceId), change);
  if (decision.kind !== 'apply') return { kind: 'ignored' };
  const outcome = await applyChange(deps, round.books, change);
  return settleOutcome(deps, round, change, outcome);
}

export { openRound, reconcileChange, releaseHeld };
export type { Reconciliation, Round, RoundOpened };
