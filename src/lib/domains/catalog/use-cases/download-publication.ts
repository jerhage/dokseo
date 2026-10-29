import type { BookId, ContentHash } from '$lib/shared/ids';
import type { BookMatching } from '$lib/domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '$lib/domains/library/domain/book/reading-defaults';
import type { OpenFileFailure, OpenFileResult } from '$lib/domains/library/use-cases/open-file';
import type { MarkBookChangedResult } from '$lib/domains/library/use-cases/mark-book-changed';
import { bookOriginOf } from '../domain/book-origin';
import type { ClientFailure, DownloadProgress } from '../domain/catalog-source';
import type { OriginRepository } from '../domain/origin-repository';
import type { Acquisition, RemotePublication } from '../domain/remote-publication';
import type { CatalogAccessFailure } from './catalog-access';
import { downloadAcquisition } from './download-acquisition';
import type { DownloadAcquisitionDeps } from './download-acquisition';

type OpenFile = (
  files: readonly File[],
  matching: BookMatching,
  defaults: ReadingDefaults,
) => Promise<OpenFileResult>;

type MarkBookChanged = (hash: ContentHash) => Promise<MarkBookChangedResult>;

type DownloadPublicationResult =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | ClientFailure
  | CatalogAccessFailure
  | OpenFileFailure;

type DownloadPublicationDeps = DownloadAcquisitionDeps & {
  readonly origins: OriginRepository;
  readonly openFile: OpenFile;
  readonly markBookChanged: MarkBookChanged;
  readonly now: () => number;
};

async function downloadPublication(
  deps: DownloadPublicationDeps,
  publication: RemotePublication,
  acquisition: Acquisition,
  feedPosition: number,
  matching: BookMatching,
  defaults: ReadingDefaults,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<DownloadPublicationResult> {
  const downloaded = await downloadAcquisition(deps, publication, acquisition, onProgress, signal);
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

  const marked = await deps.markBookChanged(opened.book.contentHash);
  if (marked.kind !== 'success') return marked;

  return { kind: 'success', bookId };
}

export { downloadPublication };
export type { DownloadPublicationDeps, DownloadPublicationResult, MarkBookChanged, OpenFile };
