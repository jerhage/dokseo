import { changeMarker } from '$lib/shared/change-marker';
import type { ChangeMarker } from '$lib/shared/change-marker';
import type { CaptureId } from '$lib/shared/ids';

function captureMarker(id: CaptureId, deleted: boolean, at: number): ChangeMarker {
  return changeMarker('capture', id, deleted, at);
}

export { captureMarker };
