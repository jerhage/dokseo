import type { BookId, CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ReadBookResult } from '$lib/domains/library/use-cases/read-book';
import { originLink } from '../domain/book-origin';
import type { BookOrigin } from '../domain/book-origin';
import { readOpdsFeed } from '../domain/opds-feed';
import type { OpdsFeedReading } from '../domain/opds-feed';
import type { ClientFailure, OpdsClient } from '../domain/opds-client';
import type { OriginRepository } from '../domain/origin-repository';
import type { BookOriginLink } from '../domain/remote-item';
import type { FeedPath } from '../domain/remote-publication';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type ReadBook = (id: BookId) => Promise<ReadBookResult>;

type FeedReading = Exclude<OpdsFeedReading, { readonly kind: 'not-a-feed' }>;

type BrowseCatalogResult =
  | {
      readonly kind: 'success';
      readonly reading: FeedReading;
      readonly held: ReadonlyMap<string, BookOriginLink>;
    }
  | { readonly kind: 'not-opds' }
  | ClientFailure
  | CatalogAccessFailure;

type BrowseCatalogDeps = CatalogAccessDeps & {
  readonly client: OpdsClient;
  readonly origins: OriginRepository;
  readonly readBook: ReadBook;
};

type HeldCheck =
  | { readonly kind: 'success'; readonly held: ReadonlyMap<string, BookOriginLink> }
  | StorageUnavailable;

async function heldEntries(
  deps: BrowseCatalogDeps,
  catalogId: CatalogId,
  entryIds: ReadonlySet<string>,
): Promise<HeldCheck> {
  const listed = await deps.origins.listByCatalog(catalogId);
  if (listed.kind !== 'success') return listed;

  const held = new Map<string, BookOriginLink>();
  for (const origin of listed.origins) {
    if (!entryIds.has(origin.entryId)) continue;
    const kept = await keptOrigin(deps, origin);
    if (kept.kind !== 'success') return kept;
    if (kept.held) held.set(origin.entryId, originLink(origin));
  }
  return { kind: 'success', held };
}

async function keptOrigin(
  deps: BrowseCatalogDeps,
  origin: BookOrigin,
): Promise<{ readonly kind: 'success'; readonly held: boolean } | StorageUnavailable> {
  const book = await deps.readBook(origin.bookId);
  if (book.kind === 'storage-unavailable') return book;
  if (book.kind !== 'not-found') return { kind: 'success', held: true };

  const deleted = await deps.origins.deleteByBook(origin.bookId);
  if (deleted.kind !== 'success') return deleted;
  return { kind: 'success', held: false };
}

async function browseCatalog(
  deps: BrowseCatalogDeps,
  catalogId: CatalogId,
  url: string | null,
  path: FeedPath,
  signal?: AbortSignal,
): Promise<BrowseCatalogResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;

  const feedUrl = url ?? access.catalog.rootUrl;
  const fetched = await deps.client.readFeed(feedUrl, access.credentials, signal);
  if (fetched.kind !== 'success') return fetched;

  const reading = readOpdsFeed(fetched.text, feedUrl, catalogId, path);
  if (reading.kind === 'not-a-feed') return { kind: 'not-opds' };
  if (reading.kind === 'navigation') return { kind: 'success', reading, held: new Map() };

  const entryIds = new Set(reading.feed.publications.map((publication) => publication.entryId));
  const checked = await heldEntries(deps, catalogId, entryIds);
  if (checked.kind !== 'success') return checked;
  return { kind: 'success', reading, held: checked.held };
}

export { browseCatalog };
export type { BrowseCatalogDeps, BrowseCatalogResult, ReadBook };
