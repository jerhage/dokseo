import type { RemovedBook } from '../domain/book/removed-book';

const RESTORE_HINT = 'Upload the same file again to restore it with its captures';

const REMOVAL_KEEPS_CAPTURES = `Its captures are kept. ${RESTORE_HINT}.`;

const DELETED_CAPTURES_FATE =
  'will be deleted for good, and uploading the file again will not bring them back.';

function withOriginalTitle(alias: string | null, title: string): string {
  return alias === null || alias === title ? title : `${alias} (originally ${title})`;
}

function removedBookName(book: RemovedBook): string {
  return withOriginalTitle(book.alias, book.title);
}

export {
  DELETED_CAPTURES_FATE,
  REMOVAL_KEEPS_CAPTURES,
  RESTORE_HINT,
  removedBookName,
  withOriginalTitle,
};
