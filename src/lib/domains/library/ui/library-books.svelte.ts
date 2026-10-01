import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import { LOADING, readReady, reloadFailed, reloading } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Book } from '../domain/book/book';
import { describeLibraryError } from './library-error-text';
import { failureOf, listedOf, newestFirst, revoke, shelfOf } from './library-shelf';
import type { LibraryShelf, ListedBook } from './library-shelf';

class LibraryBooks {
  state = $state.raw<ReadState<LibraryShelf>>(LOADING);

  #container: Container;
  #created = new Map<BookId, string>();
  #generation = 0;
  #listed = $derived(this.books.map(listedOf));

  constructor(container: Container) {
    this.#container = container;
  }

  get books(): readonly Book[] {
    return shelfOf(this.state).books;
  }

  get covers(): ReadonlyMap<BookId, string> {
    return shelfOf(this.state).covers;
  }

  get storedBytes(): number | null {
    return shelfOf(this.state).storedBytes;
  }

  get failure(): string | null {
    return failureOf(this.state);
  }

  get imageCounts(): ReadonlyMap<BookId, number> {
    return new Map(this.books.map((held) => [held.id, held.imageCount]));
  }

  get searchedBooks(): readonly ListedBook[] {
    return this.#listed;
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.state = reloading(this.state);

    const listed = await this.#container.library.listBooks();
    if (generation !== this.#generation) return;
    if (!listed.ok) {
      this.state = reloadFailed(this.state, describeLibraryError(listed.error));
      return;
    }

    const held = shelfOf(this.state);
    this.state = readReady({ ...held, books: newestFirst(listed.value) });

    const covers = await this.#readCovers(this.books);
    if (generation !== this.#generation) {
      revoke(covers.values());
      return;
    }
    this.#adopt(covers);

    const size = await this.#container.library.readLibrarySize();
    if (generation !== this.#generation) return;
    this.#reshelve({ storedBytes: size.ok ? size.value : null });
  }

  dispose(): void {
    this.#generation += 1;
    revoke(this.#created.values());
    this.#created = new Map();
    this.#reshelve({ covers: new Map() });
  }

  async #readCovers(books: readonly Book[]): Promise<Map<BookId, string>> {
    const read = books.map(async (book) => {
      const cover = await this.#container.library.readCover(book.id);
      return cover.ok ? ([book.id, URL.createObjectURL(cover.value)] as const) : null;
    });
    const found = await Promise.all(read);
    return new Map(found.filter((entry) => entry !== null));
  }

  #adopt(covers: Map<BookId, string>): void {
    revoke(this.#created.values());
    this.#created = covers;
    this.#reshelve({ covers: new Map(covers) });
  }

  #reshelve(change: Partial<LibraryShelf>): void {
    if (this.state.kind !== 'ready') return;
    this.state = { ...this.state, value: { ...this.state.value, ...change } };
  }
}

export { LibraryBooks };
