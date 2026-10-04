import type { SourceSnippet } from '../ocr/ocr-snippets';

const FIELD_CHECKS: SourceSnippet = {
  label: 'Checks every stored row uses',
  file: 'src/lib/shared/corrupt-row.ts',
  code: `function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isWholeNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && isNumber(value) && value >= 0;
}

function isFraction(value: unknown): value is number {
  return isNumber(value) && value >= 0 && value <= 1;
}`,
};

const CORRUPT_ROW_MESSAGE: SourceSnippet = {
  label: 'The reason a failed check gives',
  file: 'src/lib/shared/corrupt-row.ts',
  code: `function corruptRowMessage(row: string, field: string, value: unknown): string {
  if (value === undefined) return \`A stored \${row} lacks its \${field}\`;
  return \`A stored \${row} holds an unknown \${field}: \${String(value)}\`;
}`,
};

const PLACE_FITS_LAYOUT: SourceSnippet = {
  label: 'A reading place must fit the layout',
  file: 'src/lib/domains/library/domain/book/stored-book.ts',
  code: `if (place.kind !== placeKindOf(layoutKind)) {
  throw new CorruptRow('book', \`position kind for a \${layoutKind} book\`, place.kind);
}`,
};

const FITS_ON_PAGE: SourceSnippet = {
  label: 'A region box is a fraction of its page',
  file: 'src/lib/shared/geometry.ts',
  code: `function fitsOnPage(r: Edges): boolean {
  const finite = [r.x, r.y, r.width, r.height].every(Number.isFinite);
  return (
    finite &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.width > 0 &&
    r.height > 0 &&
    r.x + r.width <= 1 &&
    r.y + r.height <= 1
  );
}`,
};

const FOREIGN_FIELD: SourceSnippet = {
  label: 'A field its origin does not have',
  file: 'src/lib/domains/recognition/domain/capture/capture.ts',
  code: `function refuseForeignField(
  stored: StoredCapture,
  field: 'note' | 'confidence',
  origin: string,
): void {
  if (Object.hasOwn(stored, field)) {
    throw new CorruptRow('capture', \`\${field} for a \${origin} capture\`, stored[field]);
  }
}`,
};

const BLOB_KEYS: SourceSnippet = {
  label: 'The two files a book keeps',
  file: 'src/lib/domains/library/adapters/indexeddb-opfs-library.repo.ts',
  code: `function blobKeys(id: BookId): BlobKeys {
  if (parsedBookId(id) === null) throw new Error(\`Book id "\${id}" is not a flat storage key\`);
  return { source: \`\${id}.src\`, cover: \`\${id}.cover\` };
}`,
};

const RECOGNITION_UPGRADE: SourceSnippet = {
  label: 'The recognition upgrade, version 5',
  file: 'src/lib/domains/recognition/adapters/recognition-database.ts',
  code: `const captures = capturesStore(db, upgrading);
if (!captures.indexNames.contains(CAPTURE_BOOK_INDEX)) {
  captures.createIndex(CAPTURE_BOOK_INDEX, 'bookId', { unique: false });
}
if (!captures.indexNames.contains(CAPTURE_TAG_INDEX)) {
  captures.createIndex(CAPTURE_TAG_INDEX, 'tagIds', { unique: false, multiEntry: true });
}`,
};

const ROW_PIN: SourceSnippet = {
  label: 'One of the book row pins',
  file: 'src/lib/domains/library/adapters/book-row-format.spec.ts',
  code: `const written = store('books').get(row.id);
expect(written, BOOK_FORMAT_CHANGED).toStrictEqual(row);
expect(sortedKeys(written ?? {}), BOOK_FORMAT_CHANGED).toStrictEqual(BOOK_ROW_FIELDS);
expect(shapeOf(written), BOOK_FORMAT_CHANGED).toStrictEqual(shape);`,
};

const STORED_FORMAT_SNIPPETS: readonly SourceSnippet[] = [
  FIELD_CHECKS,
  CORRUPT_ROW_MESSAGE,
  PLACE_FITS_LAYOUT,
  FITS_ON_PAGE,
  FOREIGN_FIELD,
  BLOB_KEYS,
  RECOGNITION_UPGRADE,
  ROW_PIN,
];

export {
  BLOB_KEYS,
  CORRUPT_ROW_MESSAGE,
  FIELD_CHECKS,
  FITS_ON_PAGE,
  FOREIGN_FIELD,
  PLACE_FITS_LAYOUT,
  RECOGNITION_UPGRADE,
  ROW_PIN,
  STORED_FORMAT_SNIPPETS,
};
