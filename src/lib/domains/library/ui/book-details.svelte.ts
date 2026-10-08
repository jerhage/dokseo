import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';
import type { BookId } from '$lib/shared/ids';
import type { Book } from '../domain/book/book';
import { bookDetails } from './book-details';
import type { BookDetails } from './book-details';

type DetailsHooks = {
  readonly opened: (id: BookId) => void;
  readonly closed: () => void;
};

const NO_HOOKS: DetailsHooks = { opened: () => undefined, closed: () => undefined };

type OpenedBook = { readonly book: Book; readonly details: BookDetails };

class BookDetailsView {
  #openId = $state<BookId | null>(null);
  #openFrom: FocusReturn | null = null;
  #hooks: DetailsHooks;

  constructor(hooks: DetailsHooks = NO_HOOKS) {
    this.#hooks = hooks;
  }

  get openId(): BookId | null {
    return this.#openId;
  }

  open(id: BookId, from: FocusReturn | null = null): void {
    this.#openId = id;
    this.#openFrom = from;
    this.#hooks.opened(id);
  }

  close(): void {
    this.hide();
    this.#hooks.closed();
  }

  show(id: BookId): void {
    this.#openId = id;
  }

  hide(): void {
    this.#openId = null;
    returnFocus(this.#openFrom);
    this.#openFrom = null;
  }

  opened(books: readonly Book[]): OpenedBook | null {
    const book = books.find((candidate) => candidate.id === this.#openId);
    return book === undefined ? null : { book, details: bookDetails(book) };
  }
}

export { BookDetailsView };
export type { DetailsHooks, OpenedBook };
