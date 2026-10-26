import { match } from 'ts-pattern';
import type { DownloadProgress } from '$lib/domains/catalog/domain/catalog-source';
import type { RemotePublication } from '$lib/domains/catalog/domain/remote-publication';
import type { DownloadPublicationResult } from '$lib/domains/catalog/use-cases/download-publication';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { BookId, CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { applyHeldChanges } from './apply-held-changes';
import type { ApplyHeldChangesDeps } from './apply-held-changes';
import { listRemoteBooks } from './list-remote-books';
import type { ListRemoteBooksDeps, RemoteBook } from './list-remote-books';

type DownloadChoices = {
  readonly matching: BookMatching;
  readonly defaults: ReadingDefaults;
};

type DownloadPublication = (
  publication: RemotePublication,
  feedPosition: number,
  matching: BookMatching,
  defaults: ReadingDefaults,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
) => Promise<DownloadPublicationResult>;

type RemoteBookFailure =
  | { readonly kind: 'not-downloadable' }
  | { readonly kind: 'locked'; readonly catalogId: CatalogId }
  | { readonly kind: 'unauthorized'; readonly catalogId: CatalogId }
  | { readonly kind: 'offline' }
  | { readonly kind: 'missing-file' }
  | { readonly kind: 'server-error'; readonly status: number }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'catalog-unavailable' }
  | { readonly kind: 'unreadable-file' }
  | StorageUnavailable;

type FetchRemoteBookResult =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | RemoteBookFailure;

type DownloadRemoteBookResult =
  | {
      readonly kind: 'success';
      readonly bookId: BookId;
      readonly applied: number;
      readonly skipped: number;
    }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'not-connected' }
  | RemoteBookFailure;

type FetchRemoteBookDeps = { readonly downloadPublication: DownloadPublication };

type DownloadRemoteBookDeps = FetchRemoteBookDeps & ListRemoteBooksDeps & ApplyHeldChangesDeps;

type PublicationFailure = Exclude<DownloadPublicationResult, { readonly kind: 'success' }>;

function failureOf(catalogId: CatalogId, failure: PublicationFailure): RemoteBookFailure {
  return match(failure)
    .returnType<RemoteBookFailure>()
    .with({ kind: 'locked' }, () => ({ kind: 'locked', catalogId }))
    .with({ kind: 'unauthorized' }, () => ({ kind: 'unauthorized', catalogId }))
    .with({ kind: 'offline' }, () => ({ kind: 'offline' }))
    .with({ kind: 'not-found' }, () => ({ kind: 'missing-file' }))
    .with({ kind: 'server-error' }, ({ status }) => ({ kind: 'server-error', status }))
    .with({ kind: 'blocked' }, () => ({ kind: 'blocked' }))
    .with({ kind: 'aborted' }, () => ({ kind: 'aborted' }))
    .with(
      { kind: 'unsupported' },
      { kind: 'unknown-catalog' },
      { kind: 'unreadable-catalog' },
      () => ({
        kind: 'catalog-unavailable',
      }),
    )
    .with(
      { kind: 'source' },
      { kind: 'epub' },
      { kind: 'not-paged' },
      { kind: 'fingerprint' },
      () => ({
        kind: 'unreadable-file',
      }),
    )
    .with({ kind: 'storage-unavailable' }, (unavailable) => unavailable)
    .exhaustive();
}

async function fetchRemoteBook(
  deps: FetchRemoteBookDeps,
  book: RemoteBook,
  choices: DownloadChoices,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<FetchRemoteBookResult> {
  const { availability } = book;
  if (availability.kind !== 'downloadable') return { kind: 'not-downloadable' };
  const { origin } = availability;
  const publication: RemotePublication = {
    catalogId: origin.catalogId,
    entryId: origin.entryId,
    title: book.title,
    authors: [],
    language: book.language,
    summary: '',
    updated: origin.updated,
    cover: null,
    acquisition: origin.acquisition,
    feedPath: origin.feedPath,
  };
  const downloaded = await deps.downloadPublication(
    publication,
    origin.feedPosition,
    choices.matching,
    choices.defaults,
    onProgress,
    signal,
  );
  if (downloaded.kind !== 'success') return failureOf(origin.catalogId, downloaded);
  return { kind: 'success', bookId: downloaded.bookId };
}

async function downloadRemoteBook(
  deps: DownloadRemoteBookDeps,
  contentHash: string,
  choices: DownloadChoices,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<DownloadRemoteBookResult> {
  const listed = await listRemoteBooks(deps);
  if (listed.kind !== 'success') return listed;
  const book = listed.books.find((candidate) => candidate.contentHash === contentHash);
  if (book === undefined) return { kind: 'not-found' };

  const fetched = await fetchRemoteBook(deps, book, choices, onProgress, signal);
  if (fetched.kind !== 'success') return fetched;

  const attached = await applyHeldChanges(deps);
  if (attached.kind !== 'success') return attached;
  return {
    kind: 'success',
    bookId: fetched.bookId,
    applied: attached.applied,
    skipped: attached.skipped,
  };
}

export { downloadRemoteBook, fetchRemoteBook };
export type {
  DownloadChoices,
  DownloadPublication,
  DownloadRemoteBookDeps,
  DownloadRemoteBookResult,
  FetchRemoteBookDeps,
  FetchRemoteBookResult,
  RemoteBookFailure,
};
