import { match } from 'ts-pattern';
import type { Book } from '$lib/domains/library/domain/book/book';
import { bookFromStored } from '$lib/domains/library/domain/book/stored-book';
import type { StoredBook } from '$lib/domains/library/domain/book/stored-book';
import { describeCause } from '$lib/shared/cause';
import { isStoredFields } from '$lib/shared/corrupt-row';
import { STORED_ROW } from '../storage/row-check';

type RowPreset = 'full' | 'field-missing' | 'language-unknown' | 'count-nan' | 'hash-legacy';

type PresetOption = { readonly preset: RowPreset; readonly label: string };

type StrictRead =
  | { readonly kind: 'not-json'; readonly reason: string }
  | { readonly kind: 'not-a-row' }
  | { readonly kind: 'unreadable'; readonly reason: string }
  | { readonly kind: 'read'; readonly book: Book; readonly left: readonly string[] };

type ReadSummary = {
  readonly variant: 'success' | 'warning' | 'danger';
  readonly title: string;
  readonly text: string;
};

const LEGACY_HASH = '9a3fe1c27b6d4058a1e93c7f2b6d8e40c5a19f3e7d2b6084e1c57a9d3f0b2e6c';

const PRESET_OPTIONS: readonly PresetOption[] = [
  { preset: 'full', label: 'Full row' },
  { preset: 'field-missing', label: 'No direction' },
  { preset: 'language-unknown', label: "language: 'fr'" },
  { preset: 'count-nan', label: 'imageCount: NaN' },
  { preset: 'hash-legacy', label: 'SHA-256 hash' },
];

const NON_FINITE_MARK = '\u0000';

const NON_FINITE_VALUES = new Map<string, number>([
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['-Infinity', Number.NEGATIVE_INFINITY],
]);

const STRINGS_AND_NON_FINITE = /"(?:[^"\\]|\\.)*"|-?\bInfinity\b|\bNaN\b/g;

const MARKED_NON_FINITE = /"\\u0000(NaN|-?Infinity)"/g;

function withoutField(row: StoredBook, field: keyof StoredBook): StoredBook {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));
}

function presetRow(preset: RowPreset): StoredBook {
  return match(preset)
    .with('full', () => STORED_ROW)
    .with('field-missing', () => withoutField(STORED_ROW, 'direction'))
    .with('language-unknown', () => ({ ...STORED_ROW, language: 'fr' }))
    .with('count-nan', () => ({ ...STORED_ROW, imageCount: Number.NaN }))
    .with('hash-legacy', () => ({ ...STORED_ROW, contentHash: LEGACY_HASH }))
    .exhaustive();
}

function nonFiniteName(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isFinite(value)) return null;
  if (Number.isNaN(value)) return 'NaN';
  return value > 0 ? 'Infinity' : '-Infinity';
}

function rowText(row: StoredBook): string {
  const marked = JSON.stringify(
    row,
    (_key, value: unknown) => {
      const name = nonFiniteName(value);
      return name === null ? value : `${NON_FINITE_MARK}${name}`;
    },
    2,
  );
  return marked.replace(MARKED_NON_FINITE, '$1');
}

function presetText(preset: RowPreset): string {
  return rowText(presetRow(preset));
}

function parsedRowText(text: string): unknown {
  const marked = text.replace(STRINGS_AND_NON_FINITE, (found) =>
    found.startsWith('"') ? found : `"\\u0000${found}"`,
  );
  return JSON.parse(marked, (_key, value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith(NON_FINITE_MARK)) return value;
    return NON_FINITE_VALUES.get(value.slice(NON_FINITE_MARK.length)) ?? value;
  });
}

function strictRead(text: string): StrictRead {
  let stored: unknown;
  try {
    stored = parsedRowText(text);
  } catch (cause) {
    return { kind: 'not-json', reason: describeCause(cause) };
  }
  if (!isStoredFields(stored) || Array.isArray(stored)) return { kind: 'not-a-row' };

  let book: Book;
  try {
    book = bookFromStored(stored);
  } catch (cause) {
    return { kind: 'unreadable', reason: describeCause(cause) };
  }
  const left = Object.keys(stored).filter((field) => !(field in book));
  return { kind: 'read', book, left };
}

function readSummary(read: StrictRead): ReadSummary {
  return match(read)
    .with({ kind: 'not-json' }, ({ reason }): ReadSummary => ({
      variant: 'danger',
      title: 'Not JSON',
      text: `${reason}. A row in IndexedDB is a structured clone, never text; this check only guards the editor.`,
    }))
    .with({ kind: 'not-a-row' }, (): ReadSummary => ({
      variant: 'danger',
      title: 'Not an object',
      text: 'A book row is an object.',
    }))
    .with({ kind: 'unreadable' }, ({ reason }): ReadSummary => ({
      variant: 'warning',
      title: 'Unreadable',
      text: `${reason}. bookFromStored throws a CorruptRow, and the shelf lists the row as a book that could not be read.`,
    }))
    .with({ kind: 'read' }, ({ left }): ReadSummary => ({
      variant: 'success',
      title: 'Read as a book',
      text:
        left.length === 0
          ? 'Every field passed its check, and the book holds exactly the stored values.'
          : `Every field passed its check. Not part of Book, so left out of the read: ${left.join(', ')}.`,
    }))
    .exhaustive();
}

export {
  LEGACY_HASH,
  PRESET_OPTIONS,
  parsedRowText,
  presetRow,
  presetText,
  readSummary,
  strictRead,
};
export type { PresetOption, ReadSummary, RowPreset, StrictRead };
