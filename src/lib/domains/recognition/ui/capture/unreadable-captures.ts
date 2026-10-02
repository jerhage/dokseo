import { match } from 'ts-pattern';
import type { WriteState } from '$lib/shared/write-state';
import type { RemoveUnreadableCapturesResult } from '../../use-cases/capture/remove-unreadable-captures';
import { describeStorageFailure } from './storage-failure';

function unreadableCapturesTitle(count: number): string {
  return count === 1 ? '1 capture could not be read' : `${count} captures could not be read`;
}

function removeUnreadableLabel(count: number): string {
  return count === 1 ? 'Remove 1 unreadable capture' : `Remove ${count} unreadable captures`;
}

function removalProblem(state: WriteState<RemoveUnreadableCapturesResult>): string | null {
  return match(state)
    .with({ kind: 'idle' }, { kind: 'saving' }, () => null)
    .with({ kind: 'failed' }, ({ message }) => message)
    .with({ kind: 'done', result: { kind: 'success' } }, () => null)
    .with({ kind: 'done', result: { kind: 'storage-unavailable' } }, ({ result }) =>
      describeStorageFailure(result),
    )
    .exhaustive();
}

export { removalProblem, removeUnreadableLabel, unreadableCapturesTitle };
