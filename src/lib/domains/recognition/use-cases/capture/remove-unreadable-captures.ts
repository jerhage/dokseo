import type { CaptureId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type RemoveUnreadableCapturesResult = { readonly kind: 'success' } | StorageUnavailable;

type RemoveUnreadableCapturesDeps = {
  readonly captures: CaptureRepository;
};

async function removeUnreadableCaptures(
  deps: RemoveUnreadableCapturesDeps,
  ids: readonly CaptureId[],
): Promise<RemoveUnreadableCapturesResult> {
  for (const id of ids) {
    const removed = await deps.captures.remove(id);
    if (removed.kind !== 'success') return removed;
  }
  return { kind: 'success' };
}

export { removeUnreadableCaptures };
export type { RemoveUnreadableCapturesDeps, RemoveUnreadableCapturesResult };
