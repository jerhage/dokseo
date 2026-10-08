import type { BookId, CatalogId } from '$lib/shared/ids';
import type { BookOriginLink } from './remote-item';
import type { Acquisition, FeedPath, RemotePublication } from './remote-publication';

type BookOrigin = {
  readonly bookId: BookId;
  readonly catalogId: CatalogId;
  readonly entryId: string;
  readonly acquisition: Acquisition;
  readonly updated: string;
  readonly feedPath: FeedPath;
  readonly feedPosition: number;
  readonly downloadedAt: number;
};

function originLink(origin: BookOrigin): BookOriginLink {
  return { bookId: origin.bookId, updated: origin.updated };
}

function bookOriginOf(
  publication: RemotePublication,
  acquisition: Acquisition,
  bookId: BookId,
  feedPosition: number,
  downloadedAt: number,
): BookOrigin {
  return {
    bookId,
    catalogId: publication.catalogId,
    entryId: publication.entryId,
    acquisition,
    updated: publication.updated,
    feedPath: publication.feedPath,
    feedPosition,
    downloadedAt,
  };
}

export { bookOriginOf, originLink };
export type { BookOrigin };
