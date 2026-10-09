import { match } from 'ts-pattern';
import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
import type {
  BookCapturesExportState,
  BookCapturesFile,
} from '$lib/shared/book-captures-export-rules';
import type { BookId } from '$lib/shared/ids';

type RehearsalBook = {
  readonly id: BookId;
  readonly title: string;
  readonly captures: number;
  readonly delayMs: number;
};

type ExportLogEntry =
  | { readonly kind: 'asked'; readonly title: string }
  | { readonly kind: 'answered'; readonly title: string; readonly captures: number }
  | { readonly kind: 'settled'; readonly title: string; readonly state: string };

type RehearsalWatcher = (entry: ExportLogEntry) => void;

type Wait = (ms: number) => Promise<void>;

function fileNameFor(title: string): string {
  return `dokseo-captures-${title.toLowerCase().replaceAll(' ', '-')}.json`;
}

function exportedFile(book: RehearsalBook): BookCapturesFile {
  return {
    file: {
      text: '{"format":"dokseo-captures"}',
      name: fileNameFor(book.title),
      type: 'application/json',
    },
    captures: book.captures,
  };
}

function heldTitle(exported: BookCapturesFile, books: readonly RehearsalBook[]): string {
  return books.find((book) => fileNameFor(book.title) === exported.file.name)?.title ?? 'no book';
}

function exportStateText(state: BookCapturesExportState, books: readonly RehearsalBook[]): string {
  return match(state)
    .with({ kind: 'unprepared' }, () => 'unprepared')
    .with({ kind: 'preparing' }, () => 'preparing')
    .with({ kind: 'nothing-to-export' }, () => 'nothing to export')
    .with({ kind: 'storage-unavailable' }, () => 'storage unavailable')
    .with(
      { kind: 'ready' },
      { kind: 'saving' },
      { kind: 'needs-another-tap' },
      { kind: 'saved' },
      ({ kind, exported }) =>
        `${kind}: ${heldTitle(exported, books)}, ${exported.captures} captures`,
    )
    .exhaustive();
}

function rehearsedExporting(
  books: readonly RehearsalBook[],
  wait: Wait,
  watch: RehearsalWatcher,
): BookCapturesExporting {
  return {
    exportBookCaptures: async (id) => {
      const book = books.find((candidate) => candidate.id === id);
      if (book === undefined) return { kind: 'nothing-to-export' };
      watch({ kind: 'asked', title: book.title });
      await wait(book.delayMs);
      watch({ kind: 'answered', title: book.title, captures: book.captures });
      return { kind: 'success', exported: exportedFile(book) };
    },
  };
}

export { exportStateText, fileNameFor, heldTitle, rehearsedExporting };
export type { ExportLogEntry, RehearsalBook, RehearsalWatcher, Wait };
