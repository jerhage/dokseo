import type { StorageUnavailable } from './storage-unavailable';

const OUTBOX_STORE = 'outbox';

const RECORD_VERSION_STORE = 'record-versions';

const CHANGE_KEY_PATH = ['kind', 'recordId'];

type ChangeKind = 'book' | 'position' | 'capture' | 'tag' | 'catalog';

type ChangeMarker = {
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly deleted: boolean;
  readonly at: number;
  readonly changeId: string;
};

type RecordVersion = {
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly updatedAt: number;
  readonly deviceId: string;
};

type HeldVersion = Pick<RecordVersion, 'updatedAt' | 'deviceId'>;

type SettledMarker = {
  readonly marker: ChangeMarker;
  readonly version: HeldVersion;
};

type AcceptedVersion = {
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly version: HeldVersion;
};

type RecordVersions =
  | { readonly kind: 'success'; readonly versions: readonly RecordVersion[] }
  | StorageUnavailable;

type PendingMarkers =
  | { readonly kind: 'success'; readonly markers: readonly ChangeMarker[] }
  | StorageUnavailable;

type ChangeTracking = 'marked' | 'unmarked';

function changeMarker(
  kind: ChangeKind,
  recordId: string,
  deleted: boolean,
  at: number,
): ChangeMarker {
  return { kind, recordId, deleted, at, changeId: crypto.randomUUID() };
}

function compareText(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 0;
  return left > right ? 1 : -1;
}

function isLaterVersion(candidate: HeldVersion, held: HeldVersion): boolean {
  if (candidate.updatedAt !== held.updatedAt) return candidate.updatedAt > held.updatedAt;
  return compareText(candidate.deviceId, held.deviceId) > 0;
}

function markChanged(transaction: IDBTransaction, marker: ChangeMarker): void {
  transaction.objectStore(OUTBOX_STORE).put(marker);
}

function createChangeStores(db: IDBDatabase): void {
  for (const store of [OUTBOX_STORE, RECORD_VERSION_STORE]) {
    if (!db.objectStoreNames.contains(store)) {
      db.createObjectStore(store, { keyPath: CHANGE_KEY_PATH });
    }
  }
}

export {
  CHANGE_KEY_PATH,
  OUTBOX_STORE,
  RECORD_VERSION_STORE,
  changeMarker,
  compareText,
  createChangeStores,
  isLaterVersion,
  markChanged,
};
export type {
  AcceptedVersion,
  ChangeKind,
  ChangeMarker,
  ChangeTracking,
  HeldVersion,
  PendingMarkers,
  RecordVersion,
  RecordVersions,
  SettledMarker,
};
