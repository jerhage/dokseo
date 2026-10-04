import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { UNTITLED_BOOK } from '../domain/book/removed-book';
import type { RemovedBook, UnreadableRemovedBook } from '../domain/book/removed-book';

type BookRemoval = 'keep-captures' | 'delete-captures';

type RemovedEntry = {
  readonly id: BookId;
  readonly name: string;
  readonly language: Language | null;
};

const RESTORE_HINT = 'Upload the same file again to restore it with its captures';

const REMOVAL_KEEPS_CAPTURES = `Its captures are kept. ${RESTORE_HINT}.`;

const REMOVAL_DELETES_CAPTURES =
  'Its captures will be deleted for good; uploading the file again will not bring them back.';

const DELETE_CAPTURES_CHOICE = 'Also delete its captures';

const DEFAULT_REMOVAL: BookRemoval = 'keep-captures';

const UNREADABLE_REMOVED_HINT = `Could not be read. ${RESTORE_HINT}`;

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

function unreadableRemovedBookName(book: UnreadableRemovedBook): string {
  if (book.alias !== null) return book.alias;
  if (book.title !== UNTITLED_BOOK) return book.title;
  const fileName = book.fileName.trim();
  return fileName.length > 0 ? fileName : UNTITLED_BOOK;
}

function removedEntryFor(
  id: BookId,
  removed: readonly RemovedBook[],
  unreadable: readonly UnreadableRemovedBook[],
): RemovedEntry | null {
  const book = removed.find((held) => held.id === id);
  if (book !== undefined) return { id, name: removedBookName(book), language: book.language };
  const retired = unreadable.find((held) => held.id === id);
  if (retired === undefined) return null;
  return { id, name: unreadableRemovedBookName(retired), language: retired.language };
}

export {
  DEFAULT_REMOVAL,
  DELETE_CAPTURES_CHOICE,
  DELETED_CAPTURES_FATE,
  REMOVAL_DELETES_CAPTURES,
  REMOVAL_KEEPS_CAPTURES,
  RESTORE_HINT,
  UNREADABLE_REMOVED_HINT,
  removalChosen,
  removalNote,
  removedBookName,
  removedEntryFor,
  unreadableRemovedBookName,
  withOriginalTitle,
};
export type { BookRemoval, RemovedEntry };
