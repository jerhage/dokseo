import { readCatalogVersions } from '$lib/domains/catalog/use-cases/read-catalog-versions';
import { readPendingCatalogChanges } from '$lib/domains/catalog/use-cases/read-pending-catalog-changes';
import { readBookVersions } from '$lib/domains/library/use-cases/read-book-versions';
import { readPendingBookChanges } from '$lib/domains/library/use-cases/read-pending-book-changes';
import { readPendingRecognitionChanges } from '$lib/domains/recognition/use-cases/capture/read-pending-recognition-changes';
import { readRecognitionVersions } from '$lib/domains/recognition/use-cases/capture/read-recognition-versions';
import type { ChangeMarker, HeldVersion, RecordVersion } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { SyncKind } from '../domain/change';
import type { LocalSide } from '../domain/local-change';
import type { ApplyDeps } from './apply-change';

type LocalStates = {
  readonly markers: ReadonlyMap<string, ChangeMarker>;
  readonly versions: ReadonlyMap<string, HeldVersion>;
};

type LocalStatesRead =
  | { readonly kind: 'success'; readonly states: LocalStates }
  | StorageUnavailable;

function stateKey(kind: SyncKind, recordId: string): string {
  return `${kind}\u0000${recordId}`;
}

function sideOf(states: LocalStates, kind: SyncKind, recordId: string): LocalSide {
  const key = stateKey(kind, recordId);
  return { marker: states.markers.get(key), version: states.versions.get(key) };
}

function keyed<T extends { readonly kind: SyncKind; readonly recordId: string }>(
  rows: readonly T[],
): ReadonlyMap<string, T> {
  return new Map(rows.map((row) => [stateKey(row.kind, row.recordId), row]));
}

async function readLocalStates(deps: ApplyDeps): Promise<LocalStatesRead> {
  const bookMarkers = await readPendingBookChanges(deps.shelf);
  if (bookMarkers.kind !== 'success') return bookMarkers;
  const captureMarkers = await readPendingRecognitionChanges(deps.captures);
  if (captureMarkers.kind !== 'success') return captureMarkers;
  const catalogMarkers = await readPendingCatalogChanges(deps.catalogs);
  if (catalogMarkers.kind !== 'success') return catalogMarkers;
  const bookVersions = await readBookVersions(deps.shelf);
  if (bookVersions.kind !== 'success') return bookVersions;
  const captureVersions = await readRecognitionVersions(deps.captures);
  if (captureVersions.kind !== 'success') return captureVersions;
  const catalogVersions = await readCatalogVersions(deps.catalogs);
  if (catalogVersions.kind !== 'success') return catalogVersions;

  const versions: readonly RecordVersion[] = [
    ...bookVersions.versions,
    ...captureVersions.versions,
    ...catalogVersions.versions,
  ];
  return {
    kind: 'success',
    states: {
      markers: keyed([
        ...bookMarkers.markers,
        ...captureMarkers.markers,
        ...catalogMarkers.markers,
      ]),
      versions: keyed(versions),
    },
  };
}

export { readLocalStates, sideOf, stateKey };
export type { LocalStates, LocalStatesRead };
