import type { BookId } from '$lib/shared/ids';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { OpenFileFailure, OpenFileResult } from '$lib/domains/library/use-cases/open-file';
import { bookOriginOf } from '../domain/book-origin';
import type { ClientFailure, DownloadProgress } from '../domain/catalog-source';
import type { OriginRepository } from '../domain/origin-repository';
import type { RemotePublication } from '../domain/remote-publication';
import type { CatalogAccessFailure } from './catalog-access';
import { downloadAcquisition } from './download-acquisition';
import type { DownloadAcquisitionDeps } from './download-acquisition';

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

type DownloadPublicationDeps = DownloadAcquisitionDeps & {
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
  const downloaded = await downloadAcquisition(deps, publication, onProgress, signal);
  if (downloaded.kind !== 'success') return downloaded;

  const opened = await deps.openFile([downloaded.file], matching, defaults);
  if (opened.kind !== 'added' && opened.kind !== 'restored' && opened.kind !== 'already-held') {
    return opened;
  }

  const bookId = opened.book.id;
  const recorded = await deps.origins.put(
    bookOriginOf(publication, downloaded.acquisition, bookId, feedPosition, deps.now()),
  );
  if (recorded.kind !== 'success') return recorded;

  return { kind: 'success', bookId };
}

export { downloadPublication };
export type { DownloadPublicationDeps, DownloadPublicationResult, OpenFile };
