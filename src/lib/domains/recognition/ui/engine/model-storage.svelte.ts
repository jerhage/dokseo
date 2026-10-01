import { match } from 'ts-pattern';
import type { ReadState } from '$lib/shared/read-state';
import { isPartlyStored, isStored } from '../../domain/model/model-cache';
import { isPartlyDownloaded } from '../../domain/model/model-partial';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';

type ShownStorage = {
  readonly snapshot: ModelStorageSnapshot | null;
  readonly message: string | null;
};

function shownStorage(state: ReadState<ModelStorageSnapshot>): ShownStorage {
  return match(state)
    .returnType<ShownStorage>()
    .with({ kind: 'loading' }, () => ({ snapshot: null, message: null }))
    .with({ kind: 'failed' }, (failed) => ({ snapshot: null, message: failed.message }))
    .with({ kind: 'ready' }, (ready) => ({ snapshot: ready.value, message: null }))
    .exhaustive();
}

function isModelStored(snapshot: ModelStorageSnapshot | null): boolean {
  return snapshot !== null && isStored(snapshot.report);
}

function isResumable(snapshot: ModelStorageSnapshot | null): boolean {
  if (snapshot === null || isStored(snapshot.report)) return false;
  return isPartlyStored(snapshot.report) || isPartlyDownloaded(snapshot.partial);
}

export { isModelStored, isResumable, shownStorage };
export type { ShownStorage };
