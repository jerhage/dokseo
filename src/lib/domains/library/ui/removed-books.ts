import { match } from 'ts-pattern';
import type { RemovedBook } from '../domain/book/removed-book';

type BookRemoval = 'keep-captures' | 'delete-captures';

const RESTORE_HINT = 'Upload the same file again to restore it with its captures';

const REMOVAL_KEEPS_CAPTURES = `Its captures are kept. ${RESTORE_HINT}.`;

const REMOVAL_DELETES_CAPTURES =
  'Its captures will be deleted for good; uploading the file again will not bring them back.';

const DELETE_CAPTURES_CHOICE = 'Also delete its captures';

const DEFAULT_REMOVAL: BookRemoval = 'keep-captures';

const DELETED_CAPTURES_FATE =
  'will be deleted for good, and uploading the file again will not bring them back.';

function withOriginalTitle(alias: string | null, title: string): string {
  return alias === null || alias === title ? title : `${alias} (originally ${title})`;
}

function removalNote(removal: BookRemoval): string {
  return match(removal)
    .with('keep-captures', () => REMOVAL_KEEPS_CAPTURES)
    .with('delete-captures', () => REMOVAL_DELETES_CAPTURES)
    .exhaustive();
}

function removalChosen(deleteCaptures: boolean): BookRemoval {
  return deleteCaptures ? 'delete-captures' : 'keep-captures';
}

function removedBookName(book: RemovedBook): string {
  return withOriginalTitle(book.alias, book.title);
}

export {
  DEFAULT_REMOVAL,
  DELETE_CAPTURES_CHOICE,
  DELETED_CAPTURES_FATE,
  REMOVAL_DELETES_CAPTURES,
  REMOVAL_KEEPS_CAPTURES,
  RESTORE_HINT,
  removalChosen,
  removalNote,
  removedBookName,
  withOriginalTitle,
};
export type { BookRemoval };
