import type { BookId, CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { ReadBookResult } from '$lib/domains/library/use-cases/read-book';
import { originLink } from '../domain/book-origin';
import type { BookOrigin } from '../domain/book-origin';
import type { OriginRepository } from '../domain/origin-repository';
import type { BookOriginLink } from '../domain/remote-item';

type ReadBook = (id: BookId) => Promise<ReadBookResult>;

type HeldOriginsDeps = {
  readonly origins: OriginRepository;
  readonly readBook: ReadBook;
};

type OriginCheck =
  | {
      readonly kind: 'success';
      readonly kept: readonly BookOrigin[];
      readonly dangling: readonly BookOrigin[];
    }
  | StorageUnavailable;

type HeldOriginsResult =
  | { readonly kind: 'success'; readonly held: ReadonlyMap<string, BookOriginLink> }
  | StorageUnavailable;

type BookPresence =
  | { readonly kind: 'success'; readonly origin: BookOrigin; readonly present: boolean }
  | StorageUnavailable;

async function presenceOf(deps: HeldOriginsDeps, origin: BookOrigin): Promise<BookPresence> {
  const book = await deps.readBook(origin.bookId);
  if (book.kind === 'storage-unavailable') return book;
  return { kind: 'success', origin, present: book.kind !== 'not-found' };
}

async function checkedOrigins(deps: HeldOriginsDeps, catalogId: CatalogId): Promise<OriginCheck> {
  const listed = await deps.origins.listByCatalog(catalogId);
  if (listed.kind !== 'success') return listed;

  const checks = await Promise.all(listed.origins.map((origin) => presenceOf(deps, origin)));
  const kept: BookOrigin[] = [];
  const dangling: BookOrigin[] = [];
  for (const check of checks) {
    if (check.kind !== 'success') return check;
    if (check.present) kept.push(check.origin);
    else dangling.push(check.origin);
  }
  return { kind: 'success', kept, dangling };
}

async function heldOrigins(
  deps: HeldOriginsDeps,
  catalogId: CatalogId,
): Promise<HeldOriginsResult> {
  const checked = await checkedOrigins(deps, catalogId);
  if (checked.kind !== 'success') return checked;

  const held = new Map<string, BookOriginLink>();
  for (const origin of checked.kept) held.set(origin.entryId, originLink(origin));
  return { kind: 'success', held };
}

export { checkedOrigins, heldOrigins };
export type { HeldOriginsDeps, HeldOriginsResult, OriginCheck, ReadBook };
