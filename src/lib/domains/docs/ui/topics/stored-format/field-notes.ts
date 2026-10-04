import {
  CONTINUOUS_BOOK_ROW,
  FLOW_BOOK_ROW,
  PAGED_BOOK_ROW,
  PAGE_LIST_ROW,
  REMOVED_FLOW_BOOK_ROW,
  REMOVED_PAGED_BOOK_ROW,
} from '$lib/shared/testing/stored-format/library-rows';
import {
  GRAMMAR_TAG_ROW,
  LIFTED_CAPTURE_ROW,
  RECOGNIZED_CAPTURE_ROW,
  SCORED_CAPTURE_ROW,
  VOCABULARY_TAG_ROW,
  WRITTEN_CAPTURE_ROW,
} from '$lib/shared/testing/stored-format/recognition-rows';

type RecordKind = 'book' | 'page-list' | 'removed-book' | 'capture' | 'tag';

type StoredRow = { readonly [field: string]: unknown };

type FieldNote = {
  readonly path: string;
  readonly type: string;
  readonly meaning: string;
  readonly rule: string;
};

type Variant = { readonly name: string; readonly row: StoredRow };

type RecordFormat = {
  readonly kind: RecordKind;
  readonly title: string;
  readonly variants: readonly Variant[];
  readonly notes: readonly FieldNote[];
};

type FieldLeaf = { readonly path: string; readonly value: unknown };

type FieldRow = FieldNote & { readonly example: string };

const EXAMPLE_LENGTH = 36;

const LIST_MARK = '[]';

const BOOK_NOTES: readonly FieldNote[] = [
  {
    path: 'id',
    type: 'string',
    meaning: 'A random UUID made on this device. Captures, book files and /read/<id> use it.',
    rule: 'Not empty, and no /, \\ or ..',
  },
  { path: 'title', type: 'string', meaning: 'From the metadata or the file name.', rule: 'Text' },
  {
    path: 'alias',
    type: 'string | null',
    meaning: 'The name the reader gave the book.',
    rule: 'Text or null',
  },
  {
    path: 'seriesId',
    type: 'string | null',
    meaning: 'Reserved for series. Null for every book in 1.0.',
    rule: 'Null, or text that is not empty',
  },
  {
    path: 'volume',
    type: 'number | null',
    meaning: 'Reserved for series, for ordering.',
    rule: 'A finite number or null',
  },
  { path: 'language', type: 'string', meaning: 'ja, ko or en.', rule: 'A known value' },
  {
    path: 'layoutKind',
    type: 'string',
    meaning: 'paged, continuous or flow.',
    rule: 'A known value',
  },
  { path: 'direction', type: 'string', meaning: 'rtl or ltr.', rule: 'A known value' },
  {
    path: 'pagePairing',
    type: 'string',
    meaning: 'auto, single, double or double-after-cover.',
    rule: 'A known value',
  },
  { path: 'pageFit', type: 'string', meaning: 'height or width.', rule: 'A known value' },
  {
    path: 'sourceKind',
    type: 'string',
    meaning: 'images, pdf, archive or epub.',
    rule: 'A known value; a flow book is epub',
  },
  {
    path: 'contentHash',
    type: 'string',
    meaning: 'The partial MD5 of the file.',
    rule: '32 lowercase hex digits',
  },
  { path: 'fileName', type: 'string', meaning: 'The uploaded file or folder name.', rule: 'Text' },
  {
    path: 'imageCount',
    type: 'number',
    meaning: 'Page images; 0 for a flow book.',
    rule: 'A whole number',
  },
  { path: 'addedAt', type: 'number', meaning: 'When it was added, in ms.', rule: 'Finite' },
  {
    path: 'position.kind',
    type: 'string',
    meaning: 'image for paged and continuous, text for flow.',
    rule: 'Fits the layout kind',
  },
  {
    path: 'position.index',
    type: 'number',
    meaning: 'Image place: the image the view starts at.',
    rule: 'A whole number',
  },
  {
    path: 'position.shownThrough',
    type: 'number',
    meaning: 'Image place: the last image shown, the second page of a spread.',
    rule: 'A whole number, at least index',
  },
  {
    path: 'position.offset',
    type: 'number',
    meaning: 'Image place: how far down that image the view starts, as a fraction of its height.',
    rule: 'A fraction, 0 to 1',
  },
  {
    path: 'position.cfi',
    type: 'string',
    meaning: 'Text place: an EPUB CFI; empty means the start of the book.',
    rule: 'Text',
  },
  {
    path: 'position.fraction',
    type: 'number | null',
    meaning: 'Text place: how far through the book; null when none was reported.',
    rule: 'A fraction, 0 to 1, or null',
  },
  {
    path: 'lastReadAt',
    type: 'number | null',
    meaning: 'When it was last read, in ms; null when never.',
    rule: 'Finite or null',
  },
  {
    path: 'finishedAt',
    type: 'number | null',
    meaning: 'When it was finished, in ms; null when not.',
    rule: 'Finite or null',
  },
];

const PAGE_LIST_NOTES: readonly FieldNote[] = [
  { path: 'id', type: 'string', meaning: 'The book id.', rule: 'Not empty, and no /, \\ or ..' },
  {
    path: 'names',
    type: 'string[]',
    meaning: 'Entry paths in reading order.',
    rule: 'A list of text that is not empty',
  },
];

const REMOVED_BOOK_NOTES: readonly FieldNote[] = [
  {
    path: 'removedAt',
    type: 'number',
    meaning: 'When the book was removed, in ms.',
    rule: 'Finite',
  },
];

const CAPTURE_NOTES: readonly FieldNote[] = [
  { path: 'id', type: 'string', meaning: 'A random UUID.', rule: 'Text that is not empty' },
  {
    path: 'bookId',
    type: 'string',
    meaning: 'The id of its book. Indexed.',
    rule: 'Not empty, and no /, \\ or ..',
  },
  {
    path: 'anchor.kind',
    type: 'string',
    meaning: 'region for a page image, text for an EPUB passage.',
    rule: 'A known value',
  },
  {
    path: 'anchor.regions[].index',
    type: 'number',
    meaning: 'Region: the image the box is on.',
    rule: 'A whole number',
  },
  {
    path: 'anchor.regions[].rect.x',
    type: 'number',
    meaning: 'Region: left edge, as a fraction of the page width.',
    rule: 'Finite, and the box fits on the page',
  },
  {
    path: 'anchor.regions[].rect.y',
    type: 'number',
    meaning: 'Region: top edge, as a fraction of the page height.',
    rule: 'Finite, and the box fits on the page',
  },
  {
    path: 'anchor.regions[].rect.width',
    type: 'number',
    meaning: 'Region: width, as a fraction of the page width.',
    rule: 'More than 0, and the box fits on the page',
  },
  {
    path: 'anchor.regions[].rect.height',
    type: 'number',
    meaning: 'Region: height, as a fraction of the page height.',
    rule: 'More than 0, and the box fits on the page',
  },
  {
    path: 'anchor.cfi',
    type: 'string',
    meaning: 'Text: the EPUB CFI range of the passage.',
    rule: 'Text',
  },
  {
    path: 'anchor.quote.exact',
    type: 'string',
    meaning: 'Text: the quoted passage.',
    rule: 'Text',
  },
  {
    path: 'anchor.quote.prefix',
    type: 'string',
    meaning: 'Text: what comes before it.',
    rule: 'Text',
  },
  {
    path: 'anchor.quote.suffix',
    type: 'string',
    meaning: 'Text: what comes after it.',
    rule: 'Text',
  },
  {
    path: 'anchor.chapter',
    type: 'string | null',
    meaning: 'Text: the chapter title.',
    rule: 'Text or null',
  },
  { path: 'text', type: 'string', meaning: 'The captured text.', rule: 'Text' },
  { path: 'createdAt', type: 'number', meaning: 'When it was taken, in ms.', rule: 'Finite' },
  {
    path: 'editedAt',
    type: 'number | null',
    meaning: 'When its text was last edited, in ms.',
    rule: 'Null, or finite and not before createdAt',
  },
  {
    path: 'tagIds',
    type: 'string[]',
    meaning: 'The ids of its tags. A multiEntry index.',
    rule: 'Distinct text that is not empty',
  },
  {
    path: 'origin',
    type: 'string',
    meaning: 'recognized by OCR, written by hand, or lifted from EPUB text.',
    rule: 'A known value',
  },
  {
    path: 'note',
    type: 'string | null',
    meaning: 'The reader’s note. Only on recognized and lifted.',
    rule: 'Present on those two, absent on written',
  },
  {
    path: 'confidence',
    type: 'number | null',
    meaning: 'The recognizer’s score, or null. Only on recognized.',
    rule: 'Present on recognized only; finite or null',
  },
];

const TAG_NOTES: readonly FieldNote[] = [
  { path: 'id', type: 'string', meaning: 'A random UUID.', rule: 'Text that is not empty' },
  {
    path: 'name',
    type: 'string',
    meaning: 'The shown name.',
    rule: 'Not empty once trimmed',
  },
  {
    path: 'colour',
    type: 'string',
    meaning: 'One of the 16 tag colors.',
    rule: 'A known value',
  },
  { path: 'createdAt', type: 'number', meaning: 'When it was made, in ms.', rule: 'Finite' },
];

const RECORD_FORMATS: readonly RecordFormat[] = [
  {
    kind: 'book',
    title: 'Book row',
    variants: [
      { name: 'paged', row: PAGED_BOOK_ROW },
      { name: 'continuous', row: CONTINUOUS_BOOK_ROW },
      { name: 'flow', row: FLOW_BOOK_ROW },
    ],
    notes: BOOK_NOTES,
  },
  {
    kind: 'page-list',
    title: 'Page list',
    variants: [{ name: 'archive', row: PAGE_LIST_ROW }],
    notes: PAGE_LIST_NOTES,
  },
  {
    kind: 'removed-book',
    title: 'Removed-book record',
    variants: [
      { name: 'removed paged', row: REMOVED_PAGED_BOOK_ROW },
      { name: 'removed flow', row: REMOVED_FLOW_BOOK_ROW },
    ],
    notes: [...BOOK_NOTES, ...REMOVED_BOOK_NOTES],
  },
  {
    kind: 'capture',
    title: 'Capture row',
    variants: [
      { name: 'recognized', row: RECOGNIZED_CAPTURE_ROW },
      { name: 'recognized, scored', row: SCORED_CAPTURE_ROW },
      { name: 'written', row: WRITTEN_CAPTURE_ROW },
      { name: 'lifted', row: LIFTED_CAPTURE_ROW },
    ],
    notes: CAPTURE_NOTES,
  },
  {
    kind: 'tag',
    title: 'Tag row',
    variants: [
      { name: 'vocabulary', row: VOCABULARY_TAG_ROW },
      { name: 'grammar', row: GRAMMAR_TAG_ROW },
    ],
    notes: TAG_NOTES,
  },
];

function isFieldObject(value: unknown): value is StoredRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function childPath(prefix: string, field: string): string {
  return prefix === '' ? field : `${prefix}.${field}`;
}

function leavesOf(value: unknown, prefix = ''): readonly FieldLeaf[] {
  if (isFieldObject(value)) {
    return Object.entries(value).flatMap(([field, held]) =>
      leavesOf(held, childPath(prefix, field)),
    );
  }
  if (Array.isArray(value) && value.length > 0 && value.every(isFieldObject)) {
    return value.flatMap((item) => leavesOf(item, `${prefix}${LIST_MARK}`));
  }
  return [{ path: prefix, value }];
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    const [first] = value;
    return first === undefined ? LIST_MARK : `${typeOf(first)}${LIST_MARK}`;
  }
  return typeof value;
}

function declaredTypes(note: FieldNote): readonly string[] {
  return note.type.split(' | ');
}

function fitsDeclared(note: FieldNote, value: unknown): boolean {
  const found = typeOf(value);
  const declared = declaredTypes(note);
  if (found === LIST_MARK) return declared.some((type) => type.endsWith(LIST_MARK));
  return declared.includes(found);
}

function fixturePaths(format: RecordFormat): readonly string[] {
  const paths = format.variants.flatMap((variant) =>
    leavesOf(variant.row).map((leaf) => leaf.path),
  );
  return [...new Set(paths)];
}

function exampleText(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length <= EXAMPLE_LENGTH ? text : `${text.slice(0, EXAMPLE_LENGTH - 1)}…`;
}

function exampleFor(format: RecordFormat, path: string): string {
  for (const variant of format.variants) {
    const leaf = leavesOf(variant.row).find((candidate) => candidate.path === path);
    if (leaf !== undefined) return exampleText(leaf.value);
  }
  return '';
}

function fieldRows(format: RecordFormat): readonly FieldRow[] {
  return format.notes.map((note) => ({ ...note, example: exampleFor(format, note.path) }));
}

function ownFieldRows(format: RecordFormat, base: RecordFormat): readonly FieldRow[] {
  const inherited = new Set(base.notes.map((note) => note.path));
  return fieldRows(format).filter((row) => !inherited.has(row.path));
}

function recordFormat(kind: RecordKind): RecordFormat {
  const format = RECORD_FORMATS.find((candidate) => candidate.kind === kind);
  if (format === undefined) throw new Error(`No stored record format is named ${kind}`);
  return format;
}

export {
  RECORD_FORMATS,
  fieldRows,
  fitsDeclared,
  fixturePaths,
  leavesOf,
  ownFieldRows,
  recordFormat,
  typeOf,
};
export type { FieldLeaf, FieldNote, FieldRow, RecordFormat, RecordKind, StoredRow, Variant };
