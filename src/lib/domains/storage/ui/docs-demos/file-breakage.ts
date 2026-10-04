import { match } from 'ts-pattern';
import type { CapturesFile } from '../../use-cases/captures-file';

type FileBreak =
  | 'none'
  | 'not-json'
  | 'other-format'
  | 'newer-version'
  | 'version-text'
  | 'no-list';

type EntryBreak =
  | 'capture-text'
  | 'capture-origin'
  | 'tag-colour'
  | 'book-language'
  | 'repeated-capture'
  | 'missing-tag'
  | 'unknown-book-key';

type BreakOption<B> = { readonly value: B; readonly label: string };

type LooseFile = {
  readonly format: unknown;
  readonly version: unknown;
  readonly exportedAt: unknown;
  readonly appVersion: unknown;
  readonly books: unknown;
  readonly tags: readonly unknown[];
  readonly captures: readonly unknown[];
};

const FILE_BREAKS: readonly BreakOption<FileBreak>[] = [
  { value: 'none', label: 'Leave the file whole' },
  { value: 'not-json', label: 'Cut the file off halfway' },
  { value: 'other-format', label: "format: 'notes-backup'" },
  { value: 'newer-version', label: 'version: 2' },
  { value: 'version-text', label: "version: '1', a string" },
  { value: 'no-list', label: 'books: an object, not a list' },
];

const ENTRY_BREAKS: readonly BreakOption<EntryBreak>[] = [
  { value: 'capture-text', label: 'Capture 2 loses its text' },
  { value: 'capture-origin', label: "Capture 1 has origin 'drawn'" },
  { value: 'tag-colour', label: "Tag 2 has colour 'purple'" },
  { value: 'book-language', label: "Book 2 has language 'fr'" },
  { value: 'repeated-capture', label: 'Capture 1 appears twice' },
  { value: 'missing-tag', label: 'Capture 2 names a tag the file lacks' },
  { value: 'unknown-book-key', label: "Capture 3 names bookKey 'book-9'" },
];

const ABSENT_TAG = '00000000-0000-4000-8000-000000000000';

function isFileBreak(value: string): value is FileBreak {
  return FILE_BREAKS.some((option) => option.value === value);
}

function without(entry: unknown, field: string): unknown {
  if (typeof entry !== 'object' || entry === null) return entry;
  return Object.fromEntries(Object.entries(entry).filter(([key]) => key !== field));
}

function withField(entry: unknown, field: string, value: unknown): unknown {
  if (typeof entry !== 'object' || entry === null) return entry;
  return { ...entry, [field]: value };
}

function replacedAt(list: readonly unknown[], index: number, change: (entry: unknown) => unknown) {
  return list.map((entry, at) => (at === index ? change(entry) : entry));
}

function entryBroken(file: LooseFile, broken: EntryBreak): LooseFile {
  return match(broken)
    .returnType<LooseFile>()
    .with('capture-text', () => ({
      ...file,
      captures: replacedAt(file.captures, 1, (entry) => without(entry, 'text')),
    }))
    .with('capture-origin', () => ({
      ...file,
      captures: replacedAt(file.captures, 0, (entry) => withField(entry, 'origin', 'drawn')),
    }))
    .with('tag-colour', () => ({
      ...file,
      tags: replacedAt(file.tags, 1, (entry) => withField(entry, 'colour', 'purple')),
    }))
    .with('book-language', () => ({
      ...file,
      books: Array.isArray(file.books)
        ? replacedAt(file.books, 1, (entry) => withField(entry, 'language', 'fr'))
        : file.books,
    }))
    .with('repeated-capture', () => ({
      ...file,
      captures: [...file.captures, file.captures[0]],
    }))
    .with('missing-tag', () => ({
      ...file,
      captures: replacedAt(file.captures, 1, (entry) => withField(entry, 'tagIds', [ABSENT_TAG])),
    }))
    .with('unknown-book-key', () => ({
      ...file,
      captures: replacedAt(file.captures, 2, (entry) => withField(entry, 'bookKey', 'book-9')),
    }))
    .exhaustive();
}

function fileBroken(file: LooseFile, broken: FileBreak): LooseFile {
  return match(broken)
    .returnType<LooseFile>()
    .with('none', 'not-json', () => file)
    .with('other-format', () => ({ ...file, format: 'notes-backup' }))
    .with('newer-version', () => ({ ...file, version: 2 }))
    .with('version-text', () => ({ ...file, version: '1' }))
    .with('no-list', () => ({ ...file, books: { 'book-1': file.books } }))
    .exhaustive();
}

function brokenText(
  file: CapturesFile,
  whole: FileBreak,
  entries: ReadonlySet<EntryBreak>,
): string {
  const loose: LooseFile = { ...file };
  const ordered = ENTRY_BREAKS.filter((option) => entries.has(option.value));
  const broken = fileBroken(
    ordered.reduce((current, option) => entryBroken(current, option.value), loose),
    whole,
  );
  const text = JSON.stringify(broken, null, 2);
  return whole === 'not-json' ? text.slice(0, Math.floor(text.length / 2)) : text;
}

export { ABSENT_TAG, ENTRY_BREAKS, FILE_BREAKS, brokenText, isFileBreak };
export type { BreakOption, EntryBreak, FileBreak };
