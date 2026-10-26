import { readPendingCatalogChanges } from '$lib/domains/catalog/use-cases/read-pending-catalog-changes';
import { settleCatalogChanges } from '$lib/domains/catalog/use-cases/settle-catalog-changes';
import { readPendingBookChanges } from '$lib/domains/library/use-cases/read-pending-book-changes';
import { settleBookChanges } from '$lib/domains/library/use-cases/settle-book-changes';
import { readPendingRecognitionChanges } from '$lib/domains/recognition/use-cases/capture/read-pending-recognition-changes';
import { settleRecognitionChanges } from '$lib/domains/recognition/use-cases/capture/settle-recognition-changes';
import type { ChangeKind, ChangeMarker, SettledMarker } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Change, SyncKind } from '../domain/change';
import { batchesOf, changeBytes } from '../domain/push-batches';
import type { RejectionCode, ServerFailure, SyncServer } from '../domain/sync-server';
import type { SyncStateStore } from '../domain/sync-state';
import { loadHoldings } from './load-holdings';
import type { HoldingsDeps } from './load-holdings';
import { planChange } from './plan-change';

type PushedRecord = { readonly kind: SyncKind; readonly recordId: string };

type PushChangesResult =
  | { readonly kind: 'success'; readonly pushed: number; readonly waiting: number }
  | { readonly kind: 'not-connected' }
  | {
      readonly kind: 'rejected';
      readonly code: RejectionCode;
      readonly record: PushedRecord | null;
    }
  | StorageUnavailable
  | Exclude<ServerFailure, { readonly kind: 'not-found' | 'rejected' }>;

type PushChangesDeps = HoldingsDeps & {
  readonly server: SyncServer;
  readonly state: SyncStateStore;
};

type PendingPush = {
  readonly marker: ChangeMarker;
  readonly change: Change;
  readonly bytes: number;
};

type MarkersRead =
  | { readonly kind: 'success'; readonly markers: readonly ChangeMarker[] }
  | StorageUnavailable;

type Outgoing =
  | { readonly kind: 'ready'; readonly pending: readonly PendingPush[]; readonly waiting: number }
  | StorageUnavailable;

async function readMarkers(deps: PushChangesDeps): Promise<MarkersRead> {
  const books = await readPendingBookChanges(deps.shelf);
  if (books.kind !== 'success') return books;
  const recognition = await readPendingRecognitionChanges(deps.captures);
  if (recognition.kind !== 'success') return recognition;
  const catalogs = await readPendingCatalogChanges(deps.catalogs);
  if (catalogs.kind !== 'success') return catalogs;
  const markers = [...books.markers, ...recognition.markers, ...catalogs.markers];
  return { kind: 'success', markers: markers.toSorted((a, b) => a.at - b.at) };
}

async function planOutgoing(
  deps: PushChangesDeps,
  markers: readonly ChangeMarker[],
  deviceId: string,
): Promise<Outgoing> {
  const loaded = await loadHoldings(deps, markers);
  if (loaded.kind !== 'success') return loaded;

  const pending: PendingPush[] = [];
  let waiting = 0;
  for (const marker of markers) {
    const planned = planChange(marker, loaded.holdings);
    if (planned.kind === 'waiting') {
      waiting += 1;
      continue;
    }
    const change: Change = {
      id: marker.changeId,
      kind: marker.kind,
      recordId: marker.recordId,
      data: planned.data,
      updatedAt: marker.at,
      deviceId,
    };
    pending.push({ marker, change, bytes: changeBytes(change) });
  }
  return { kind: 'ready', pending, waiting };
}

async function settleBatch(
  deps: PushChangesDeps,
  batch: readonly PendingPush[],
  deviceId: string,
): Promise<StorageUnavailable | null> {
  const settled: SettledMarker[] = batch.map(({ marker }) => ({
    marker,
    version: { updatedAt: marker.at, deviceId },
  }));
  const inDatabase = (...kinds: readonly ChangeKind[]) =>
    settled.filter((entry) => kinds.includes(entry.marker.kind));

  const books = inDatabase('book', 'position');
  if (books.length > 0) {
    const written = await settleBookChanges(deps.shelf, books);
    if (written.kind !== 'success') return written;
  }
  const recognition = inDatabase('capture', 'tag');
  if (recognition.length > 0) {
    const written = await settleRecognitionChanges(deps.captures, recognition);
    if (written.kind !== 'success') return written;
  }
  const catalogs = inDatabase('catalog');
  if (catalogs.length > 0) {
    const written = await settleCatalogChanges(deps.catalogs, catalogs);
    if (written.kind !== 'success') return written;
  }
  return null;
}

function rejectedRecord(index: number | null, batch: readonly PendingPush[]): PushedRecord | null {
  if (index === null) return null;
  const entry = batch[index];
  if (entry === undefined) return null;
  return { kind: entry.change.kind, recordId: entry.change.recordId };
}

async function pushChanges(deps: PushChangesDeps): Promise<PushChangesResult> {
  const held = await deps.state.read();
  if (held.kind !== 'success') return held;
  const { connection } = held;
  if (connection === null) return { kind: 'not-connected' };

  const read = await readMarkers(deps);
  if (read.kind !== 'success') return read;

  const outgoing = await planOutgoing(deps, read.markers, connection.deviceId);
  if (outgoing.kind !== 'ready') return outgoing;

  let pushed = 0;
  for (const batch of batchesOf(outgoing.pending)) {
    const sent = await deps.server.push(
      connection.serverUrl,
      connection.token,
      batch.map((entry) => entry.change),
    );
    if (sent.kind === 'rejected') {
      return {
        kind: 'rejected',
        code: sent.code,
        record: sent.code === 'invalid-change' ? rejectedRecord(sent.index, batch) : null,
      };
    }
    if (sent.kind !== 'success') return sent;

    const unsettled = await settleBatch(deps, batch, connection.deviceId);
    if (unsettled !== null) return unsettled;
    pushed += batch.length;
  }
  return { kind: 'success', pushed, waiting: outgoing.waiting };
}

export { pushChanges };
export type { PushChangesDeps, PushChangesResult, PushedRecord };
