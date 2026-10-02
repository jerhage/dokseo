import type { UnreadableBook } from '../domain/book/stored-book';
import { withOriginalTitle } from './removed-books';

const SHORT_ID_LENGTH = 8;

function unreadableBooksTitle(count: number): string {
  return count === 1 ? '1 book could not be read' : `${count} books could not be read`;
}

function nonBlank(text: string | null): string | null {
  return text !== null && text.trim().length > 0 ? text : null;
}

function unreadableBookName(book: UnreadableBook): string {
  const title = nonBlank(book.title);
  const alias = nonBlank(book.alias);
  if (title !== null) return withOriginalTitle(alias, title);
  return alias ?? `Untitled book (${book.id.slice(0, SHORT_ID_LENGTH)})`;
}

export { unreadableBookName, unreadableBooksTitle };
