import { listOrigins } from '$lib/domains/catalog/use-cases/list-origins';
import type { ListOriginsDeps } from '$lib/domains/catalog/use-cases/list-origins';
import { listCatalogs } from '$lib/domains/catalog/use-cases/list-catalogs';
import type { ListCatalogsDeps } from '$lib/domains/catalog/use-cases/list-catalogs';
import { listBooks } from '$lib/domains/library/use-cases/list-books';
import type { ListBooksDeps } from '$lib/domains/library/use-cases/list-books';
import { listEveryCapture } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import type { ListEveryCaptureDeps } from '$lib/domains/recognition/use-cases/capture/list-every-capture';
import { listTags } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { ListTagsDeps } from '$lib/domains/recognition/use-cases/tag/list-tags';
import type { ChangeMarker } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Held, Holdings } from './plan-change';

type HoldingsDeps = {
  readonly shelf: ListBooksDeps;
  readonly origins: ListOriginsDeps;
  readonly captures: ListEveryCaptureDeps;
  readonly tags: ListTagsDeps;
  readonly catalogs: ListCatalogsDeps;
};

type Needs = {
  readonly books: boolean;
  readonly origins: boolean;
  readonly captures: boolean;
  readonly tags: boolean;
  readonly catalogs: boolean;
};

function nothingHeld<T>(): Held<T> {
  return { found: new Map<string, T>(), unreadable: new Set<string>() };
}

function needsOf(markers: readonly ChangeMarker[]): Needs {
  const sent = markers.filter((marker) => !marker.deleted);
  const has = (...kinds: readonly ChangeMarker['kind'][]) =>
    sent.some((marker) => kinds.includes(marker.kind));
  return {
    books: has('book', 'position', 'capture'),
    origins: has('book'),
    captures: has('capture'),
    tags: has('tag'),
    catalogs: has('catalog'),
  };
}

function heldBy<T>(
  records: readonly T[],
  idOf: (record: T) => string,
  unreadable: readonly string[],
): Held<T> {
  return {
    found: new Map(records.map((record) => [idOf(record), record])),
    unreadable: new Set(unreadable),
  };
}

type LoadedHoldings =
  | { readonly kind: 'success'; readonly holdings: Holdings }
  | StorageUnavailable;

async function loadHoldings(
  deps: HoldingsDeps,
  markers: readonly ChangeMarker[],
): Promise<LoadedHoldings> {
  const needs = needsOf(markers);
  let holdings: Holdings = {
    books: nothingHeld(),
    bookKeys: new Map(),
    origins: new Map(),
    captures: nothingHeld(),
    tags: nothingHeld(),
    catalogs: nothingHeld(),
  };

  if (needs.books) {
    const listed = await listBooks(deps.shelf);
    if (listed.kind !== 'success') return listed;
    holdings = {
      ...holdings,
      books: heldBy(
        listed.books,
        (book) => book.contentHash,
        listed.unreadable.map((book) => book.contentHash),
      ),
      bookKeys: new Map(listed.books.map((book) => [book.id, book.contentHash])),
    };
  }
  if (needs.origins) {
    const listed = await listOrigins(deps.origins);
    if (listed.kind !== 'success') return listed;
    holdings = {
      ...holdings,
      origins: new Map(listed.origins.map((origin) => [origin.bookId, origin])),
    };
  }
  if (needs.captures) {
    const listed = await listEveryCapture(deps.captures);
    if (listed.kind !== 'success') return listed;
    holdings = {
      ...holdings,
      captures: heldBy(
        listed.captures,
        (capture) => capture.id,
        listed.unreadable.map((capture) => capture.id),
      ),
    };
  }
  if (needs.tags) {
    const listed = await listTags(deps.tags);
    if (listed.kind !== 'success') return listed;
    holdings = {
      ...holdings,
      tags: heldBy(
        listed.tags,
        (tag) => tag.id,
        listed.unreadable.map((tag) => tag.id),
      ),
    };
  }
  if (needs.catalogs) {
    const listed = await listCatalogs(deps.catalogs);
    if (listed.kind !== 'success') return listed;
    holdings = {
      ...holdings,
      catalogs: heldBy(
        listed.catalogs,
        (catalog) => catalog.id,
        listed.unreadable.map((catalog) => catalog.id),
      ),
    };
  }
  return { kind: 'success', holdings };
}

export { loadHoldings };
export type { HoldingsDeps, LoadedHoldings };
