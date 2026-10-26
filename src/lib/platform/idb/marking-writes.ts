import { OUTBOX_STORE, RECORD_VERSION_STORE } from '$lib/shared/change-marker';
import type { AcceptedVersion, ChangeMarker, ChangeTracking } from '$lib/shared/change-marker';
import type { RecordWrite } from './connection';

function markingWrites(
  tracking: ChangeTracking,
  markers: readonly ChangeMarker[],
): readonly RecordWrite[] {
  if (tracking === 'unmarked') return [];
  return markers.map((marker) => ({ kind: 'mark', marker }));
}

function acceptedWrites(accepted: AcceptedVersion): readonly RecordWrite[] {
  const { kind, recordId, version } = accepted;
  return [
    {
      kind: 'put',
      store: RECORD_VERSION_STORE,
      record: { kind, recordId, updatedAt: version.updatedAt, deviceId: version.deviceId },
    },
    { kind: 'delete', store: OUTBOX_STORE, key: [kind, recordId] },
  ];
}

export { acceptedWrites, markingWrites };
