import type { BookId } from '$lib/shared/ids';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { OpenFileFailure, OpenFileResult } from '$lib/domains/library/use-cases/open-file';
import { fallbackFileName } from '../domain/download-file-name';
import type { ClientFailure, DownloadProgress, OpdsClient } from '../domain/opds-client';
import type { OriginRepository } from '../domain/origin-repository';
import type { RemotePublication } from '../domain/remote-publication';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type OpenFile = (
  files: readonly File[],
  matching: BookMatching,
  defaults: ReadingDefaults,
) => Promise<OpenFileResult>;

type DownloadPublicationResult =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | { readonly kind: 'unsupported' }
  | ClientFailure
  | CatalogAccessFailure
  | OpenFileFailure;

type DownloadPublicationDeps = CatalogAccessDeps & {
  readonly client: OpdsClient;
  readonly origins: OriginRepository;
  readonly openFile: OpenFile;
  readonly now: () => number;
};

async function downloadPublication(
  deps: DownloadPublicationDeps,
  publication: RemotePublication,
  feedPosition: number,
  matching: BookMatching,
  defaults: ReadingDefaults,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<DownloadPublicationResult> {
  const { acquisition } = publication;
  if (acquisition === null) return { kind: 'unsupported' };

  const access = await catalogAccess(deps, publication.catalogId);
  if (access.kind !== 'success') return access;

  const downloaded = await deps.client.download(
    acquisition,
    access.credentials,
    fallbackFileName(publication.title, acquisition.format),
    onProgress,
    signal,
  );
  if (downloaded.kind !== 'success') return downloaded;

  const opened = await deps.openFile([downloaded.file], matching, defaults);
  if (opened.kind !== 'added' && opened.kind !== 'restored' && opened.kind !== 'already-held') {
    return opened;
  }

  const bookId = opened.book.id;
  const recorded = await deps.origins.put({
    bookId,
    catalogId: publication.catalogId,
    entryId: publication.entryId,
    acquisition,
    updated: publication.updated,
    feedPath: publication.feedPath,
    feedPosition,
    downloadedAt: deps.now(),
  });
  if (recorded.kind !== 'success') return recorded;

  return { kind: 'success', bookId };
}

export { downloadPublication };
export type { DownloadPublicationDeps, DownloadPublicationResult, OpenFile };
