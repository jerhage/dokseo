import { match } from 'ts-pattern';
import type { ReadState } from '$lib/shared/read-state';
import { shownTitle } from '$lib/shared/shown-title';
import type { ListRemoteBooksResult, RemoteBook } from '../use-cases/list-remote-books';
import type { RemoteDownload } from './remote-downloads';

type RemoteBooksView =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'listed'; readonly books: readonly RemoteBook[] };

type RemoteBookRow = {
  readonly title: string;
  readonly status: string;
  readonly downloadable: boolean;
  readonly action: string;
};

const HIDDEN: RemoteBooksView = { kind: 'hidden' };

const NOT_DOWNLOADED_TEXT = 'Not downloaded';

const NOT_ON_THIS_DEVICE_TEXT = 'Not on this device. Add the file to read it here.';

function remoteBooksView(state: ReadState<ListRemoteBooksResult>): RemoteBooksView {
  if (state.kind !== 'ready') return HIDDEN;
  const { value } = state;
  if (value.kind !== 'success' || value.books.length === 0) return HIDDEN;
  return { kind: 'listed', books: value.books };
}

function downloadStatus(download: RemoteDownload): string {
  return match(download)
    .returnType<string>()
    .with({ kind: 'idle' }, () => NOT_DOWNLOADED_TEXT)
    .with({ kind: 'running' }, ({ progress }) =>
      progress === null ? 'Downloading…' : `Downloading ${Math.round(progress * 100)}%`,
    )
    .with({ kind: 'failed' }, ({ reason }) => reason)
    .exhaustive();
}

function remoteBookRow(book: RemoteBook, download: RemoteDownload): RemoteBookRow {
  return match(book.availability)
    .returnType<RemoteBookRow>()
    .with({ kind: 'downloadable' }, () => ({
      title: shownTitle(book),
      status: downloadStatus(download),
      downloadable: true,
      action: download.kind === 'failed' ? 'Try again' : 'Download',
    }))
    .with({ kind: 'not-on-this-device' }, () => ({
      title: shownTitle(book),
      status: NOT_ON_THIS_DEVICE_TEXT,
      downloadable: false,
      action: '',
    }))
    .exhaustive();
}

export { remoteBookRow, remoteBooksView };
export type { RemoteBookRow, RemoteBooksView };
