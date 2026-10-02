import { match } from 'ts-pattern';
import { UNKNOWN_BOOK } from '../domain/book/removed-book';
import type { RemovedShelfEntry } from '../domain/book/removed-book';

const RESTORE_HINT = 'Upload the same file again to restore it with its captures';

const NO_RESTORE_HINT = 'No file is known for these, so they cannot be restored';

const REMOVAL_KEEPS_CAPTURES = `Its captures are kept. ${RESTORE_HINT}.`;

function captureCountText(count: number): string {
  return count === 1 ? '1 capture' : `${count.toLocaleString()} captures`;
}

function deletedCapturesFate(count: number): string {
  const kept = count === 1 ? 'it' : 'them';
  return `will be deleted for good, and uploading the file again will not bring ${kept} back.`;
}

function withOriginalTitle(alias: string | null, title: string): string {
  return alias === null || alias === title ? title : `${alias} (originally ${title})`;
}

function removedEntryName(entry: RemovedShelfEntry): string {
  return match(entry)
    .with({ kind: 'recorded' }, ({ book }) => withOriginalTitle(book.alias, book.title))
    .with({ kind: 'unknown' }, () => UNKNOWN_BOOK)
    .exhaustive();
}

function removedEntryDescription(entry: RemovedShelfEntry): string {
  const hint = entry.kind === 'recorded' ? RESTORE_HINT : NO_RESTORE_HINT;
  return `${captureCountText(entry.captureCount)} · ${hint}`;
}

export {
  NO_RESTORE_HINT,
  REMOVAL_KEEPS_CAPTURES,
  RESTORE_HINT,
  captureCountText,
  deletedCapturesFate,
  removedEntryDescription,
  removedEntryName,
  withOriginalTitle,
};
