import type { ChangeMarker, ChangeTracking } from '$lib/shared/change-marker';
import type { RecordWrite } from './connection';

function markingWrites(
  tracking: ChangeTracking,
  markers: readonly ChangeMarker[],
): readonly RecordWrite[] {
  if (tracking === 'unmarked') return [];
  return markers.map((marker) => ({ kind: 'mark', marker }));
}

export { markingWrites };
