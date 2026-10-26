import type { CatalogRepository } from '$lib/domains/catalog/domain/catalog-repository';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { Language } from '$lib/shared/language';
import { shownTitle } from '$lib/shared/shown-title';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { HeldChangeStore } from '../domain/held-changes';
import type { SyncStateStore } from '../domain/sync-state';
import { fromSyncBookData } from './book-data';
import type { SyncedOrigin } from './book-data';

type RemoteAvailability =
  | { readonly kind: 'downloadable'; readonly origin: SyncedOrigin }
  | { readonly kind: 'not-on-this-device' };

type RemoteBook = {
  readonly contentHash: string;
  readonly title: string;
  readonly alias: string | null;
  readonly language: Language;
  readonly availability: RemoteAvailability;
};

type ListRemoteBooksResult =
  | { readonly kind: 'success'; readonly books: readonly RemoteBook[] }
  | { readonly kind: 'not-connected' }
  | StorageUnavailable;

type ListRemoteBooksDeps = {
  readonly state: SyncStateStore;
  readonly held: HeldChangeStore;
  readonly shelf: { readonly repository: LibraryRepository };
  readonly catalogs: { readonly catalogs: CatalogRepository };
};

const NOT_ON_THIS_DEVICE: RemoteAvailability = { kind: 'not-on-this-device' };

async function availabilityOf(
  deps: ListRemoteBooksDeps,
  origin: SyncedOrigin | null,
): Promise<RemoteAvailability | StorageUnavailable> {
  if (origin === null) return NOT_ON_THIS_DEVICE;
  const found = await deps.catalogs.catalogs.get(origin.catalogId);
  if (found.kind === 'storage-unavailable') return found;
  if (found.kind !== 'success' || found.catalog === null) return NOT_ON_THIS_DEVICE;
  return { kind: 'downloadable', origin };
}

async function listRemoteBooks(deps: ListRemoteBooksDeps): Promise<ListRemoteBooksResult> {
  const read = await deps.state.read();
  if (read.kind !== 'success') return read;
  if (read.connection === null) return { kind: 'not-connected' };

  const held = await deps.held.list();
  if (held.kind !== 'success') return held;
  const shelf = await listBooks(deps.shelf);
  if (shelf.kind !== 'success') return shelf;
  const onShelf = new Set<string>(shelf.books.map((book) => book.contentHash));

  const books: RemoteBook[] = [];
  for (const change of held.changes) {
    if (change.kind !== 'book' || change.data === null) continue;
    if (onShelf.has(change.recordId)) continue;
    const data = fromSyncBookData(change.data);
    if (data.kind !== 'success') continue;
    const availability = await availabilityOf(deps, data.origin);
    if (availability.kind === 'storage-unavailable') return availability;
    books.push({
      contentHash: change.recordId,
      title: data.book.title,
      alias: data.book.alias,
      language: data.book.language,
      availability,
    });
  }
  books.sort((a, b) => shownTitle(a).localeCompare(shownTitle(b)));
  return { kind: 'success', books };
}

export { listRemoteBooks };
export type { ListRemoteBooksDeps, ListRemoteBooksResult, RemoteAvailability, RemoteBook };
