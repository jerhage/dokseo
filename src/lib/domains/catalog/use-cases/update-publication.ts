import type { BookId } from '$lib/shared/ids';
import type { ReplaceBookFileResult } from '$lib/domains/library/use-cases/replace-book-file';
import { bookOriginOf } from '../domain/book-origin';
import type { ClientFailure, DownloadProgress } from '../domain/opds-client';
import type { OriginRepository } from '../domain/origin-repository';
import type { RemotePublication } from '../domain/remote-publication';
import type { CatalogAccessFailure } from './catalog-access';
import { downloadAcquisition } from './download-acquisition';
import type { DownloadAcquisitionDeps } from './download-acquisition';

type ReplaceFile = (id: BookId, files: readonly File[]) => Promise<ReplaceBookFileResult>;

type UpdatePublicationResult =
  | { readonly kind: 'success'; readonly bookId: BookId }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'book-missing'; readonly bookId: BookId }
  | { readonly kind: 'already-held'; readonly bookId: BookId }
  | ClientFailure
  | CatalogAccessFailure
  | Exclude<
      ReplaceBookFileResult,
      { readonly kind: 'replaced' | 'same-file' | 'not-found' | 'already-held' }
    >;

type UpdatePublicationDeps = DownloadAcquisitionDeps & {
  readonly origins: OriginRepository;
  readonly replaceBookFile: ReplaceFile;
  readonly now: () => number;
};

async function updatePublication(
  deps: UpdatePublicationDeps,
  publication: RemotePublication,
  bookId: BookId,
  feedPosition: number,
  onProgress: DownloadProgress,
  signal?: AbortSignal,
): Promise<UpdatePublicationResult> {
  const downloaded = await downloadAcquisition(deps, publication, onProgress, signal);
  if (downloaded.kind !== 'success') return downloaded;

  const replaced = await deps.replaceBookFile(bookId, [downloaded.file]);
  if (replaced.kind === 'not-found') return { kind: 'book-missing', bookId };
  if (replaced.kind === 'already-held') return { kind: 'already-held', bookId: replaced.book.id };
  if (replaced.kind !== 'replaced' && replaced.kind !== 'same-file') return replaced;

  const recorded = await deps.origins.put(
    bookOriginOf(publication, downloaded.acquisition, bookId, feedPosition, deps.now()),
  );
  if (recorded.kind !== 'success') return recorded;

  return { kind: 'success', bookId };
}

export { updatePublication };
export type { ReplaceFile, UpdatePublicationDeps, UpdatePublicationResult };
