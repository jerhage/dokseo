import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Change, SyncKind } from './change';

type HeldChangesRead =
  | { readonly kind: 'success'; readonly changes: readonly Change[] }
  | StorageUnavailable;

type HeldChangesWrite = { readonly kind: 'success' } | StorageUnavailable;

interface HeldChangeStore {
  list(): Promise<HeldChangesRead>;
  put(change: Change): Promise<HeldChangesWrite>;
  remove(kind: SyncKind, recordId: string): Promise<HeldChangesWrite>;
}

export type { HeldChangeStore, HeldChangesRead, HeldChangesWrite };
