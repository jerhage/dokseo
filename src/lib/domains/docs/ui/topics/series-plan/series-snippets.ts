import type { SourceSnippet } from '../ocr/ocr-snippets';

const BOOK_SERIES_FIELDS: SourceSnippet = {
  label: 'The two reserved fields on Book',
  file: 'src/lib/domains/library/domain/book/book.ts',
  code: `type Book = {
  readonly id: BookId;
  readonly title: string;
  readonly alias: string | null;
  readonly seriesId: SeriesId | null;
  readonly volume: number | null;`,
};

const STORED_SERIES_FIELDS: SourceSnippet = {
  label: 'Reading them from a stored row',
  file: 'src/lib/domains/library/domain/book/stored-book.ts',
  code: `function isSeriesIdOrNull(value: unknown): value is string | null {
  return value === null || (isText(value) && value.length > 0);
}

function storedSeriesId(value: unknown): SeriesId | null {
  const stored = bookField('series id', value, isSeriesIdOrNull);
  return stored === null ? null : seriesId(stored);
}`,
};

const BOOK_FROM_STORED_SERIES: SourceSnippet = {
  label: 'Two of the fields bookFromStored checks',
  file: 'src/lib/domains/library/domain/book/stored-book.ts',
  code: `seriesId: storedSeriesId(stored.seriesId),
volume: bookField('volume', stored.volume, isNumberOrNull),`,
};

const FINITE_NUMBER: SourceSnippet = {
  label: 'A stored number is finite',
  file: 'src/lib/shared/corrupt-row.ts',
  code: `function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}`,
};

const REPOSITORY_UPDATE: SourceSnippet = {
  label: 'Every book save goes through update()',
  file: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
  code: `async update(id: BookId, edit: BookEdit): Promise<BookLookup> {
  if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
  const db = await database();
  const record = await getRecord<StoredBook>(db, BOOK_STORE, id);
  if (record === undefined) return { kind: 'success', book: null };
  const updated = applyEdit(bookFromStored(record), edit);
  await putRecord(db, BOOK_STORE, updated);
  return { kind: 'success', book: updated };
}`,
};

const REMOVED_RECORD: SourceSnippet = {
  label: 'A removed record is the whole book and a time',
  file: 'src/lib/domains/library/domain/book/removed-book.ts',
  code: `function removedRecord(book: Book, removedAt: number): RemovedBook {
  return { ...book, removedAt };
}

function removedBookFromStored(stored: StoredRemovedBook): RemovedBook {
  const book = bookFromStored(stored);
  const removedAt = knownStoredValue('removed book', 'removed time', stored.removedAt, isNumber);
  return removedRecord(book, removedAt);
}`,
};

const REMOVED_SERIES_FIELDS: SourceSnippet = {
  label: 'A record that fails the strict read offers them when they pass',
  file: 'src/lib/domains/library/domain/book/removed-book.ts',
  code: `function seriesIdOf(value: unknown): SeriesId | null {
  return isText(value) && value.length > 0 ? seriesId(value) : null;
}

function volumeOf(value: unknown): number | null {
  return isNumberOrNull(value) ? value : null;
}`,
};

const RESTORE_SERIES_FIELDS: SourceSnippet = {
  label: 'A restore keeps them',
  file: 'src/lib/domains/library/use-cases/open-file.ts',
  code: `alias: restoring?.alias ?? null,
seriesId: restoring?.seriesId ?? null,
volume: restoring?.volume ?? null,`,
};

const FILE_SERIES_FIELDS: SourceSnippet = {
  label: 'The export file reads them as optional',
  file: 'src/lib/domains/storage/use-cases/read-captures-file.ts',
  code: `function fileSeriesId(value: unknown): SeriesId | null {
  if (value === undefined) return null;
  const read = field('book', 'series id', value, isTextOrNull);
  return read === null ? null : seriesId(read);
}

function fileVolume(value: unknown): number | null {
  return value === undefined ? null : field('book', 'volume', value, isNumberOrNull);
}`,
};

const FOLIATE_SERIES: SourceSnippet = {
  label: 'foliate-js 1.0.1, the series in its parsed metadata',
  file: 'node_modules/foliate-js/epub.js',
  code: `series: belongsTo.series?.map(makeCollection)
?? legacyMeta?.['calibre:series'] ? {
    name: legacyMeta?.['calibre:series'],
    position: parseFloat(legacyMeta?.['calibre:series_index']),
} : null,`,
};

const SERIES_SNIPPETS: readonly SourceSnippet[] = [
  BOOK_SERIES_FIELDS,
  STORED_SERIES_FIELDS,
  BOOK_FROM_STORED_SERIES,
  FINITE_NUMBER,
  REPOSITORY_UPDATE,
  REMOVED_RECORD,
  REMOVED_SERIES_FIELDS,
  RESTORE_SERIES_FIELDS,
  FILE_SERIES_FIELDS,
  FOLIATE_SERIES,
];

export {
  BOOK_FROM_STORED_SERIES,
  BOOK_SERIES_FIELDS,
  FILE_SERIES_FIELDS,
  FINITE_NUMBER,
  FOLIATE_SERIES,
  REMOVED_RECORD,
  REMOVED_SERIES_FIELDS,
  REPOSITORY_UPDATE,
  RESTORE_SERIES_FIELDS,
  SERIES_SNIPPETS,
  STORED_SERIES_FIELDS,
};
