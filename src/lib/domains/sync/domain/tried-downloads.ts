import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type TriedDownloadsRead =
  | { readonly kind: 'success'; readonly contentHashes: ReadonlySet<string> }
  | StorageUnavailable;

type TriedDownloadsWrite = { readonly kind: 'success' } | StorageUnavailable;

interface TriedDownloadStore {
  list(): Promise<TriedDownloadsRead>;
  add(contentHash: string): Promise<TriedDownloadsWrite>;
}

export type { TriedDownloadStore, TriedDownloadsRead, TriedDownloadsWrite };
