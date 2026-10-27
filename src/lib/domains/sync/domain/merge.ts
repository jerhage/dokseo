import { compareText, isLaterVersion } from '$lib/shared/change-marker';
import type { Change } from '$lib/domains/sync/domain/change';

type MergeDecision =
  | { readonly kind: 'apply'; readonly change: Change }
  | { readonly kind: 'keep-local' }
  | { readonly kind: 'already-applied' };

function precedence(a: Change, b: Change): number {
  if (isLaterVersion(a, b)) return 1;
  if (isLaterVersion(b, a)) return -1;
  return compareText(a.id, b.id);
}

function decideMerge(local: Change | null, incoming: Change): MergeDecision {
  if (local === null) return { kind: 'apply', change: incoming };
  if (local.id === incoming.id) return { kind: 'already-applied' };
  if (precedence(incoming, local) > 0) return { kind: 'apply', change: incoming };
  return { kind: 'keep-local' };
}

function recordKey(change: Change): string {
  return `${change.kind}\u0000${change.recordId}`;
}

function reduceToWinners(changes: readonly Change[]): Change[] {
  const winners = new Map<string, Change>();
  for (const change of changes) {
    const key = recordKey(change);
    const held = winners.get(key);
    if (held === undefined || precedence(change, held) > 0) winners.set(key, change);
  }
  return [...winners.values()];
}

export { decideMerge, reduceToWinners };
export type { MergeDecision };
