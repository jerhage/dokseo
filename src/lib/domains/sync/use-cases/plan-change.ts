import { match } from 'ts-pattern';
import type { BookOrigin } from '$lib/domains/catalog/domain/book-origin';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { ChangeMarker } from '$lib/shared/change-marker';
import type { BookId, ContentHash } from '$lib/shared/ids';
import type { ChangeData } from '../domain/change';
import { toSyncBookData } from './book-data';
import { toSyncCaptureData } from './capture-data';
import { toSyncCatalogData } from './catalog-data';
import { toSyncPositionData } from './position-data';
import { toSyncTagData } from './tag-data';

type Held<T> = {
  readonly found: ReadonlyMap<string, T>;
  readonly unreadable: ReadonlySet<string>;
};

type Holdings = {
  readonly books: Held<Book>;
  readonly bookKeys: ReadonlyMap<BookId, ContentHash>;
  readonly origins: ReadonlyMap<BookId, BookOrigin>;
  readonly captures: Held<Capture>;
  readonly tags: Held<Tag>;
  readonly catalogs: Held<Catalog>;
};

type PlannedChange =
  | { readonly kind: 'send'; readonly data: ChangeData | null }
  | { readonly kind: 'waiting' };

const TOMBSTONE: PlannedChange = { kind: 'send', data: null };

const WAITING: PlannedChange = { kind: 'waiting' };

function planFrom<T>(
  held: Held<T>,
  recordId: string,
  data: (record: T) => PlannedChange,
): PlannedChange {
  const record = held.found.get(recordId);
  if (record !== undefined) return data(record);
  return held.unreadable.has(recordId) ? WAITING : TOMBSTONE;
}

function planChange(marker: ChangeMarker, holdings: Holdings): PlannedChange {
  if (marker.deleted) return TOMBSTONE;
  const { recordId } = marker;
  return match(marker.kind)
    .returnType<PlannedChange>()
    .with('book', () =>
      planFrom(holdings.books, recordId, (book) => ({
        kind: 'send',
        data: toSyncBookData(book, holdings.origins.get(book.id) ?? null),
      })),
    )
    .with('position', () =>
      planFrom(holdings.books, recordId, (book) => ({
        kind: 'send',
        data: toSyncPositionData(book),
      })),
    )
    .with('capture', () =>
      planFrom(holdings.captures, recordId, (capture) => {
        const bookKey = holdings.bookKeys.get(capture.bookId);
        if (bookKey === undefined) return WAITING;
        return { kind: 'send', data: toSyncCaptureData(capture, bookKey) };
      }),
    )
    .with('tag', () =>
      planFrom(holdings.tags, recordId, (tag) => ({ kind: 'send', data: toSyncTagData(tag) })),
    )
    .with('catalog', () =>
      planFrom(holdings.catalogs, recordId, (catalog) => ({
        kind: 'send',
        data: toSyncCatalogData(catalog),
      })),
    )
    .exhaustive();
}

export { planChange };
export type { Held, Holdings, PlannedChange };
