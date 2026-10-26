import { match } from 'ts-pattern';
import type { CatalogId } from '$lib/shared/ids';
import type { DownloadRemoteBookResult } from '../use-cases/download-remote-book';
import { DIFFERENT_FILE_TEXT, OFFLINE_TEXT, STORAGE_TEXT } from './sync-texts';

type DownloadOutcome =
  | { readonly kind: 'done' }
  | { readonly kind: 'ask-password'; readonly catalogId: CatalogId; readonly refused: boolean }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly reason: string };

type RemoteDownload =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly progress: number | null }
  | { readonly kind: 'failed'; readonly reason: string };

type UnlockRequest = {
  readonly catalogId: CatalogId;
  readonly refused: boolean;
  readonly onunlocked: () => void;
  readonly ondismiss: () => void;
};

function failed(reason: string): DownloadOutcome {
  return { kind: 'failed', reason };
}

function downloadOutcome(result: DownloadRemoteBookResult): DownloadOutcome {
  return match(result)
    .returnType<DownloadOutcome>()
    .with({ kind: 'success' }, () => ({ kind: 'done' }))
    .with({ kind: 'locked' }, ({ catalogId }) => ({
      kind: 'ask-password',
      catalogId,
      refused: false,
    }))
    .with({ kind: 'unauthorized' }, ({ catalogId }) => ({
      kind: 'ask-password',
      catalogId,
      refused: true,
    }))
    .with({ kind: 'aborted' }, () => ({ kind: 'cancelled' }))
    .with({ kind: 'not-found' }, { kind: 'not-connected' }, () =>
      failed('This book is no longer listed.'),
    )
    .with({ kind: 'not-downloadable' }, () => failed('This book has no catalog on this device.'))
    .with({ kind: 'offline' }, () => failed(OFFLINE_TEXT))
    .with({ kind: 'missing-file' }, () => failed('The catalog no longer has that file.'))
    .with({ kind: 'server-error' }, ({ status }) =>
      failed(`The catalog answered with an error (status ${status}).`),
    )
    .with({ kind: 'blocked' }, () =>
      failed('The browser blocked the download. The catalog may need to allow this site.'),
    )
    .with({ kind: 'catalog-unavailable' }, () =>
      failed('The catalog for this book cannot be used. Check Settings, Catalogs.'),
    )
    .with({ kind: 'unreadable-file' }, () => failed('The downloaded file could not be opened.'))
    .with({ kind: 'different-file' }, () => failed(DIFFERENT_FILE_TEXT))
    .with({ kind: 'storage-unavailable' }, () => failed(STORAGE_TEXT))
    .exhaustive();
}

export { downloadOutcome };
export type { DownloadOutcome, RemoteDownload, UnlockRequest };
