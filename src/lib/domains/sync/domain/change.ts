type SyncKind = 'book' | 'capture' | 'tag' | 'position' | 'catalog';

type ChangeData = Readonly<Record<string, unknown>>;

type Change = {
  readonly id: string;
  readonly kind: SyncKind;
  readonly recordId: string;
  readonly data: ChangeData | null;
  readonly updatedAt: number;
  readonly deviceId: string;
};

type StoredChange = Change & {
  readonly seq: number;
  readonly receivedAt: number;
};

const SYNC_KINDS: readonly SyncKind[] = ['book', 'capture', 'tag', 'position', 'catalog'];

function isRecord(value: unknown): value is ChangeData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isSyncKind(value: unknown): value is SyncKind {
  return SYNC_KINDS.some((kind) => kind === value);
}

function isChange(value: unknown): value is Change {
  if (!isRecord(value)) return false;
  const { id, kind, recordId, data, updatedAt, deviceId } = value;
  return (
    isId(id) &&
    isSyncKind(kind) &&
    typeof recordId === 'string' &&
    recordId.length > 0 &&
    (data === null || isRecord(data)) &&
    typeof updatedAt === 'number' &&
    Number.isInteger(updatedAt) &&
    updatedAt > 0 &&
    isId(deviceId)
  );
}

export { SYNC_KINDS, isChange, isSyncKind };
export type { Change, ChangeData, StoredChange, SyncKind };
