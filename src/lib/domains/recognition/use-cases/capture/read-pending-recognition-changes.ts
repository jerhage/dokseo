import type { PendingMarkers } from '$lib/shared/change-marker';
import type { CaptureRepository } from '../../domain/capture/capture-repository';

type ReadPendingRecognitionChangesResult = PendingMarkers;

type ReadPendingRecognitionChangesDeps = { readonly captures: CaptureRepository };

function readPendingRecognitionChanges(
  deps: ReadPendingRecognitionChangesDeps,
): Promise<ReadPendingRecognitionChangesResult> {
  return deps.captures.pendingChanges();
}

export { readPendingRecognitionChanges };
export type { ReadPendingRecognitionChangesDeps, ReadPendingRecognitionChangesResult };
