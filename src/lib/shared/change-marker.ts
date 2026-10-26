const OUTBOX_STORE = 'outbox';

const RECORD_VERSION_STORE = 'record-versions';

const CHANGE_KEY_PATH = ['kind', 'recordId'];

type ChangeKind = 'book' | 'position' | 'capture' | 'tag' | 'catalog';

type ChangeMarker = {
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly deleted: boolean;
  readonly at: number;
};

type RecordVersion = {
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly updatedAt: number;
  readonly deviceId: string;
};

type ChangeTracking = 'marked' | 'unmarked';

function changeMarker(
  kind: ChangeKind,
  recordId: string,
  deleted: boolean,
  at: number,
): ChangeMarker {
  return { kind, recordId, deleted, at };
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
  createChangeStores,
  markChanged,
};
export type { ChangeKind, ChangeMarker, ChangeTracking, RecordVersion };
