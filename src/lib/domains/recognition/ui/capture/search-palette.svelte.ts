import type { BookId } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import type { PassageOrder } from '../../domain/capture/capture-order';
import type { SearchedBook } from '../../domain/capture/capture-results';
import { clampedIndex, NO_MATCH } from '../../domain/capture/match-stepping';
import { quickFinds } from '../../domain/capture/quick-find';
import type { QuickFinds, SearchFilter } from '../../domain/capture/quick-find';
import type { Tag } from '../../domain/tag/tag';
import type { CaptureFind } from './capture-find';
import { searchInvite, searchNote } from './search-copy';
import type { SearchNote, SearchRoom } from './search-copy';
import { searchKey } from './search-keys';
import type { SearchKey, SearchKeyPress } from './search-keys';
import { effectiveScope, searchRows, searchedBooks } from './search-rows';
import type { SearchRow, SearchRows, SearchScope } from './search-rows';

type PaletteSource = {
  readonly book: BookId | null;
  readonly books: readonly SearchedBook[];
  readonly covers: ReadonlyMap<BookId, string>;
  readonly counts: ReadonlyMap<BookId, number>;
  readonly tags: readonly Tag[];
  readonly captures: readonly Capture[];
  readonly passages: PassageOrder;
  readonly read: CaptureFind;
  readonly room: SearchRoom;
};

const NOTHING: QuickFinds<Capture> = { books: [], captures: [] };

class SearchPalette {
  shown = $state(false);
  present = $state(false);
  query = $state('');
  scope = $state<SearchScope>('book');
  filter = $state<SearchFilter>('everything');

  #source: () => PaletteSource;
  #at = $state(NO_MATCH);

  #scoped = $derived.by<SearchScope>(() => effectiveScope(this.#source().book, this.scope));

  #results = $derived.by<SearchRows>(() => {
    const held = this.#source();
    const scope = this.#scoped;
    const found =
      this.present && this.query.trim().length > 0
        ? quickFinds(
            held.captures,
            searchedBooks(held.books, held.book, scope),
            held.tags,
            this.query,
            this.filter,
            held.passages,
          )
        : NOTHING;

    return searchRows({
      found,
      scope,
      book: held.book,
      covers: held.covers,
      counts: held.counts,
      tags: held.tags,
      query: this.query,
    });
  });

  #cursor = $derived.by<number>(() =>
    this.#at >= this.#results.rows.length ? NO_MATCH : this.#at,
  );

  #note = $derived.by<SearchNote>(() =>
    searchNote({
      read: this.#source().read,
      query: this.query,
      rows: this.#results.rows.length,
      filter: this.filter,
      scope: this.#scoped,
    }),
  );

  #invite = $derived.by<string>(() => searchInvite(this.filter, this.#scoped, this.#source().room));

  constructor(source: () => PaletteSource) {
    this.#source = source;
  }

  get results(): SearchRows {
    return this.#results;
  }

  get cursor(): number {
    return this.#cursor;
  }

  get note(): SearchNote {
    return this.#note;
  }

  get invite(): string {
    return this.#invite;
  }

  keyFor(press: SearchKeyPress): SearchKey {
    return searchKey(press, {
      shown: this.shown,
      scope: this.scope,
      hasBook: this.#source().book !== null,
    });
  }

  reveal(chosen: SearchScope): void {
    this.shown = true;
    this.present = true;
    this.choose(chosen);
  }

  choose(chosen: SearchScope): void {
    this.scope = chosen;
    this.#at = NO_MATCH;
  }

  hide(): void {
    this.shown = false;
  }

  gone(): void {
    this.present = false;
  }

  restart(): void {
    this.#at = NO_MATCH;
  }

  toggleTags(): void {
    this.filter = this.filter === 'tags' ? 'everything' : 'tags';
    this.#at = NO_MATCH;
  }

  moveBy(by: number): number {
    this.#at = clampedIndex(this.#cursor, by, this.#results.rows.length);
    return this.#at;
  }

  rowAtCursor(): SearchRow | undefined {
    return this.#results.rows[this.#cursor === NO_MATCH ? 0 : this.#cursor];
  }
}

export { SearchPalette };
export type { PaletteSource };
