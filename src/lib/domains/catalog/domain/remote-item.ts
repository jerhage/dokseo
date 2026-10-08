import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { RemotePublication } from './remote-publication';

type BookOriginLink = { readonly bookId: BookId; readonly updated: string };

type DownloadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly progress: number | null }
  | { readonly kind: 'failed'; readonly reason: string };

type RemoteItem =
  | { readonly kind: 'remote'; readonly publication: RemotePublication }
  | { readonly kind: 'unsupported'; readonly publication: RemotePublication }
  | {
      readonly kind: 'downloading';
      readonly publication: RemotePublication;
      readonly progress: number | null;
    }
  | {
      readonly kind: 'download-failed';
      readonly publication: RemotePublication;
      readonly reason: string;
    }
  | {
      readonly kind: 'held';
      readonly publication: RemotePublication;
      readonly bookId: BookId;
    }
  | {
      readonly kind: 'held-older';
      readonly publication: RemotePublication;
      readonly bookId: BookId;
    };

function isLater(updated: string, than: string): boolean {
  const left = Date.parse(updated);
  const right = Date.parse(than);
  return !Number.isNaN(left) && !Number.isNaN(right) && left > right;
}

function settled(publication: RemotePublication, origin: BookOriginLink | null): RemoteItem {
  if (origin !== null) {
    const kind = isLater(publication.updated, origin.updated) ? 'held-older' : 'held';
    return { kind, publication, bookId: origin.bookId };
  }
  if (publication.acquisition === null) return { kind: 'unsupported', publication };
  return { kind: 'remote', publication };
}

function remoteItem(
  publication: RemotePublication,
  origin: BookOriginLink | null,
  download: DownloadState,
): RemoteItem {
  return match(download)
    .with({ kind: 'running' }, ({ progress }): RemoteItem => ({
      kind: 'downloading',
      publication,
      progress,
    }))
    .with({ kind: 'failed' }, ({ reason }): RemoteItem => ({
      kind: 'download-failed',
      publication,
      reason,
    }))
    .with({ kind: 'idle' }, () => settled(publication, origin))
    .exhaustive();
}

export { isLater, remoteItem };
export type { BookOriginLink, DownloadState, RemoteItem };
