import type { BookId, CatalogId } from '$lib/shared/ids';
import type { BookOriginLink } from './remote-item';
import type { Acquisition, FeedPath } from './remote-publication';

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

export { originLink };
export type { BookOrigin };
