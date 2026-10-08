import {
  CorruptRow,
  isNumber,
  isStoredFields,
  isStoredList,
  isText,
  isWholeNumber,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { bookId, parsedBookId, parsedCatalogId } from '$lib/shared/ids';
import type { BookId, CatalogId } from '$lib/shared/ids';
import type { BookOrigin } from './book-origin';
import type { Acquisition, AcquisitionFormat, FeedPath } from './remote-publication';

type StoredOrigin = { readonly [Field in keyof BookOrigin]?: unknown };

type UnreadableOrigin = {
  readonly bookId: BookId;
  readonly stored: StoredOrigin;
};

type StoredOrigins = {
  readonly origins: readonly BookOrigin[];
  readonly unreadable: readonly UnreadableOrigin[];
};

function originField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('origin', field, value, known);
}

function isKey(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function isFormat(value: unknown): value is AcquisitionFormat {
  return value === 'epub' || value === 'pdf' || value === 'cbz';
}

function isStep(value: unknown): value is { readonly title: string; readonly href: string } {
  return isStoredFields(value) && isText(value['title']) && isText(value['href']);
}

function isFeedPath(value: unknown): value is FeedPath {
  return isStoredList(value) && value.every(isStep);
}

function isLength(value: unknown): value is number | null {
  return value === null || isWholeNumber(value);
}

function storedAcquisition(value: unknown): Acquisition {
  if (!isStoredFields(value)) throw new CorruptRow('origin', 'acquisition', value);
  return {
    href: originField('acquisition link', value['href'], isKey),
    format: originField('acquisition format', value['format'], isFormat),
    mediaType: originField('acquisition media type', value['mediaType'], isText),
    length: originField('acquisition length', value['length'], isLength),
  };
}

function storedFeedPath(value: unknown): FeedPath {
  const path = originField('feed path', value, isFeedPath);
  return path.map((step) => ({ title: step.title, href: step.href }));
}

function storedBookId(value: unknown): BookId {
  const id = isText(value) ? parsedBookId(value) : null;
  if (id === null) throw new CorruptRow('origin', 'book id', value);
  return id;
}

function storedCatalogId(value: unknown): CatalogId {
  const id = isText(value) ? parsedCatalogId(value) : null;
  if (id === null) throw new CorruptRow('origin', 'catalog id', value);
  return id;
}

function originFromStored(stored: StoredOrigin): BookOrigin {
  return {
    bookId: storedBookId(stored.bookId),
    catalogId: storedCatalogId(stored.catalogId),
    entryId: originField('entry id', stored.entryId, isKey),
    acquisition: storedAcquisition(stored.acquisition),
    updated: originField('updated time', stored.updated, isText),
    feedPath: storedFeedPath(stored.feedPath),
    feedPosition: originField('feed position', stored.feedPosition, isWholeNumber),
    downloadedAt: originField('download time', stored.downloadedAt, isNumber),
  };
}

function unreadableOrigin(row: StoredOrigin, cause: unknown): UnreadableOrigin {
  if (typeof row.bookId !== 'string' || row.bookId.length === 0) throw cause;
  return { bookId: bookId(row.bookId), stored: row };
}

function originsFromStored(rows: readonly StoredOrigin[]): StoredOrigins {
  const origins: BookOrigin[] = [];
  const unreadable: UnreadableOrigin[] = [];
  for (const row of rows) {
    try {
      origins.push(originFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableOrigin(row, cause));
    }
  }
  return { origins, unreadable };
}

function storedOriginRow(origin: BookOrigin): StoredOrigin {
  return {
    bookId: origin.bookId,
    catalogId: origin.catalogId,
    entryId: origin.entryId,
    acquisition: {
      href: origin.acquisition.href,
      format: origin.acquisition.format,
      mediaType: origin.acquisition.mediaType,
      length: origin.acquisition.length,
    },
    updated: origin.updated,
    feedPath: origin.feedPath.map((step) => ({
      title: step.title,
      href: step.href,
    })),
    feedPosition: origin.feedPosition,
    downloadedAt: origin.downloadedAt,
  };
}

export { originFromStored, originsFromStored, storedOriginRow };
export type { StoredOrigin, StoredOrigins, UnreadableOrigin };
