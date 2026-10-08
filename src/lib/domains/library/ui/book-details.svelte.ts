import type { BookId } from '$lib/shared/ids';
import type { Book } from '../domain/book/book';
import { bookDetails } from './book-details';
import type { BookDetails } from './book-details';

type OpenedBook = { readonly book: Book; readonly details: BookDetails };

class BookDetailsView {
  #openId = $state<BookId | null>(null);

  get openId(): BookId | null {
    return this.#openId;
  }

  open(id: BookId): void {
    this.#openId = id;
  }

  close(): void {
    this.#openId = null;
  }

  opened(books: readonly Book[]): OpenedBook | null {
    const book = books.find((candidate) => candidate.id === this.#openId);
    return book === undefined ? null : { book, details: bookDetails(book) };
  }
}

export { BookDetailsView };
export type { OpenedBook };
