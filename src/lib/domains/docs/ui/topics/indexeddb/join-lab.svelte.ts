import { describeCause } from '$lib/shared/cause';
import { JOIN_STRATEGIES, joinSeed, joinWith } from '../../../domain/indexeddb-joins';
import type { JoinReader, JoinSeed, JoinStrategy } from '../../../domain/indexeddb-joins';

type JoinRun = {
  readonly strategy: JoinStrategy;
  readonly requests: number;
  readonly milliseconds: number;
  readonly books: number;
  readonly captures: number;
};

type JoinLabDeps = {
  readonly seed: (seed: JoinSeed) => Promise<void>;
  readonly reader: JoinReader;
  readonly now: () => number;
};

const BOOK_COUNTS = [10, 50, 200] as const;

const CAPTURES_PER_BOOK = 10;

type BookCount = (typeof BOOK_COUNTS)[number];

class JoinLab {
  #books = $state<BookCount>(10);
  #seeded = $state<BookCount | null>(null);
  #runs = $state.raw<readonly JoinRun[]>([]);
  #busy = $state(false);
  #failure = $state<string | null>(null);
  readonly #deps: JoinLabDeps;

  constructor(deps: JoinLabDeps) {
    this.#deps = deps;
  }

  get books(): BookCount {
    return this.#books;
  }

  set books(count: BookCount) {
    this.#books = count;
  }

  get seeded(): BookCount | null {
    return this.#seeded;
  }

  get runs(): readonly JoinRun[] {
    return this.#runs;
  }

  get busy(): boolean {
    return this.#busy;
  }

  get failure(): string | null {
    return this.#failure;
  }

  async run(): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    this.#failure = null;
    try {
      await this.#deps.seed(joinSeed(this.#books, CAPTURES_PER_BOOK));
      this.#seeded = this.#books;
      const runs: JoinRun[] = [];
      for (const strategy of JOIN_STRATEGIES) {
        const started = this.#deps.now();
        const outcome = await joinWith(strategy, this.#deps.reader);
        runs.push({
          strategy,
          requests: outcome.requests,
          milliseconds: this.#deps.now() - started,
          books: outcome.books.length,
          captures: outcome.books.reduce((sum, book) => sum + book.pages.length, 0),
        });
      }
      this.#runs = runs;
    } catch (cause) {
      this.#failure = describeCause(cause);
    } finally {
      this.#busy = false;
    }
  }
}

export { BOOK_COUNTS, CAPTURES_PER_BOOK, JoinLab };
export type { BookCount, JoinLabDeps, JoinRun };
