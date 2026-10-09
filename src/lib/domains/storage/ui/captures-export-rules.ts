import { match } from 'ts-pattern';
import type { StatusVariant } from '$lib/ui/components/classes';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { CAPTURES_FILE_TYPE } from '../use-cases/export-captures';
import type { CapturesExport, UnreadableRows } from '../use-cases/export-captures';

type LeftOut = {
  readonly bookless: number;
  readonly unreadable: UnreadableRows;
};

type ExportSummary = LeftOut & {
  readonly captures: number;
  readonly books: number;
  readonly storedUnreadable: number;
};

type CapturesExportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'exporting' }
  | { readonly kind: 'saved'; readonly summary: ExportSummary }
  | { readonly kind: 'nothing-to-export'; readonly leftOut: LeftOut }
  | {
      readonly kind: 'needs-another-tap';
      readonly file: FileToSave;
      readonly summary: ExportSummary;
    }
  | { readonly kind: 'storage-unavailable' };

type ExportStatus = {
  readonly variant: StatusVariant;
  readonly message: string;
  readonly notes: readonly string[];
};

const IDLE: CapturesExportState = { kind: 'idle' };

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function savedText(summary: ExportSummary): string {
  return `Exported ${counted(summary.captures, 'capture', 'captures')} from ${counted(summary.books, 'book', 'books')}.`;
}

function leftOutNotes(leftOut: LeftOut): readonly string[] {
  const { bookless, unreadable } = leftOut;
  return [
    bookless === 0
      ? null
      : `${counted(bookless, 'capture belongs', 'captures belong')} to no book and ${bookless === 1 ? 'was' : 'were'} left out.`,
    unreadable.captures === 0
      ? null
      : `${counted(unreadable.captures, 'stored capture', 'stored captures')} could not be read and ${unreadable.captures === 1 ? 'was' : 'were'} left out.`,
    unreadable.tags === 0
      ? null
      : `${counted(unreadable.tags, 'stored tag', 'stored tags')} could not be read and ${unreadable.tags === 1 ? 'was' : 'were'} left out.`,
    unreadable.books === 0
      ? null
      : `${counted(unreadable.books, 'stored book', 'stored books')} could not be read.`,
  ].filter((note) => note !== null);
}

function storedUnreadableNote(count: number): string | null {
  if (count === 0) return null;
  return count === 1
    ? '1 stored row that could not be read is kept in the file as it was stored. Import does not bring it back.'
    : `${count} stored rows that could not be read are kept in the file as they were stored. Import does not bring them back.`;
}

function savedNotes(summary: ExportSummary): readonly string[] {
  const { bookless, unreadable, storedUnreadable } = summary;
  return [
    ...leftOutNotes({ bookless, unreadable: { books: unreadable.books, tags: 0, captures: 0 } }),
    storedUnreadableNote(storedUnreadable),
  ].filter((note) => note !== null);
}

function exportStatus(state: CapturesExportState): ExportStatus | null {
  return match(state)
    .returnType<ExportStatus | null>()
    .with({ kind: 'idle' }, { kind: 'exporting' }, () => null)
    .with({ kind: 'saved' }, ({ summary }) => ({
      variant: 'success',
      message: savedText(summary),
      notes: savedNotes(summary),
    }))
    .with({ kind: 'nothing-to-export' }, ({ leftOut }) => ({
      variant: 'info',
      message: 'There are no captures to export.',
      notes: leftOutNotes(leftOut),
    }))
    .with({ kind: 'needs-another-tap' }, () => ({
      variant: 'info',
      message: 'The file is ready. Tap Save file to choose where it goes.',
      notes: [],
    }))
    .with({ kind: 'storage-unavailable' }, () => ({
      variant: 'warning',
      message: 'This browser blocks local storage, so there are no captures to export.',
      notes: [],
    }))
    .exhaustive();
}

function fileOf(exported: CapturesExport): FileToSave {
  return {
    text: exported.json,
    name: exported.fileName,
    type: CAPTURES_FILE_TYPE,
  };
}

function summaryOf(exported: CapturesExport): ExportSummary {
  return {
    captures: exported.captures,
    books: exported.books,
    bookless: exported.bookless,
    unreadable: exported.unreadable,
    storedUnreadable: exported.storedUnreadable,
  };
}

function settled(
  outcome: SaveFileOutcome,
  file: FileToSave,
  summary: ExportSummary,
): CapturesExportState {
  return match(outcome)
    .returnType<CapturesExportState>()
    .with({ kind: 'shared' }, { kind: 'downloaded' }, () => ({
      kind: 'saved',
      summary,
    }))
    .with({ kind: 'cancelled' }, () => IDLE)
    .with({ kind: 'needs-another-tap' }, () => ({
      kind: 'needs-another-tap',
      file,
      summary,
    }))
    .exhaustive();
}

export { IDLE, exportStatus, fileOf, leftOutNotes, savedNotes, savedText, settled, summaryOf };
export type { CapturesExportState, ExportStatus, ExportSummary, LeftOut };
