import type { SettledMarker } from '$lib/shared/change-marker';
import type { CaptureRepository, CaptureWrite } from '../../domain/capture/capture-repository';

type SettleRecognitionChangesResult = CaptureWrite;

type SettleRecognitionChangesDeps = { readonly captures: CaptureRepository };

function settleRecognitionChanges(
  deps: SettleRecognitionChangesDeps,
  settled: readonly SettledMarker[],
): Promise<SettleRecognitionChangesResult> {
  return deps.captures.settleChanges(settled);
}

export { settleRecognitionChanges };
export type { SettleRecognitionChangesDeps, SettleRecognitionChangesResult };
