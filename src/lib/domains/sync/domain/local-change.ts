import type { ChangeMarker, HeldVersion } from '$lib/shared/change-marker';
import type { Change } from './change';

type LocalSide = {
  readonly marker: ChangeMarker | undefined;
  readonly version: HeldVersion | undefined;
};

const NO_CHANGE_ID = '';

function sameVersion(version: HeldVersion, incoming: Change): boolean {
  return version.updatedAt === incoming.updatedAt && version.deviceId === incoming.deviceId;
}

function localChange(side: LocalSide, incoming: Change, deviceId: string): Change | null {
  const { marker, version } = side;
  const { kind, recordId } = incoming;
  if (marker !== undefined) {
    return { id: marker.changeId, kind, recordId, data: null, updatedAt: marker.at, deviceId };
  }
  if (version === undefined) return null;
  return {
    id: sameVersion(version, incoming) ? incoming.id : NO_CHANGE_ID,
    kind,
    recordId,
    data: null,
    updatedAt: version.updatedAt,
    deviceId: version.deviceId,
  };
}

export { localChange };
export type { LocalSide };
