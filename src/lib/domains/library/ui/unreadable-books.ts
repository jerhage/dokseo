import type { UnreadableBook } from '../domain/book/stored-book';

const SHORT_ID_LENGTH = 8;

function unreadableBooksTitle(count: number): string {
  return count === 1 ? '1 book could not be read' : `${count} books could not be read`;
}

function unreadableBookName(book: UnreadableBook): string {
  if (book.title !== null && book.title.trim().length > 0) return book.title;
  return `Untitled book (${book.id.slice(0, SHORT_ID_LENGTH)})`;
}

export { unreadableBookName, unreadableBooksTitle };
