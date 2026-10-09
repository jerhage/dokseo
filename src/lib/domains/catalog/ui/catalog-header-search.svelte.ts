import type { CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import type { CatalogSession } from './catalog-session.svelte';
import type { CatalogTabsView } from './catalog-tabs.svelte';
import { searchAvailability, searchPlaceholder } from './catalog-search';
import type { HeaderField } from './catalog-search';

const SEARCH_DEBOUNCE_MS = 400;

type SearchClock = { readonly after: (ms: number, run: () => void) => () => void };

const BROWSER_CLOCK: SearchClock = {
  after: (ms, run) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
};

class CatalogHeaderSearch {
  #tabs: CatalogTabsView;
  #session: CatalogSession;
  #clock: SearchClock;
  #pending = new Map<CatalogId, () => void>();

  constructor(tabs: CatalogTabsView, session: CatalogSession, clock: SearchClock = BROWSER_CLOCK) {
    this.#tabs = tabs;
    this.#session = session;
    this.#clock = clock;
  }

  dispose(): void {
    for (const cancel of this.#pending.values()) cancel();
    this.#pending.clear();
  }

  get field(): HeaderField | undefined {
    const catalog = this.#tabs.catalogFor(this.#tabs.selected);
    return catalog === null ? undefined : this.fieldFor(catalog);
  }

  fieldFor(catalog: Catalog): HeaderField {
    const browse = this.#tabs.browsing(catalog);
    const availability = searchAvailability(browse.feedSettled, browse.feedSearch);
    return {
      placeholder: searchPlaceholder(catalog.title, availability),
      disabled: availability === 'absent',
      value: this.#session.queryOf(catalog.id),
      oninput: (value) => {
        this.#session.type(catalog.id, value);
        this.#schedule(catalog, value);
      },
      onsubmit: (value) => {
        this.#cancel(catalog.id);
        browse.search(value);
      },
    };
  }

  #schedule(catalog: Catalog, value: string): void {
    this.#cancel(catalog.id);
    const cancel = this.#clock.after(SEARCH_DEBOUNCE_MS, () => {
      this.#pending.delete(catalog.id);
      if (this.#tabs.selected !== catalog.id) return;
      this.#tabs.browsing(catalog).search(value);
    });
    this.#pending.set(catalog.id, cancel);
  }

  #cancel(id: CatalogId): void {
    this.#pending.get(id)?.();
    this.#pending.delete(id);
  }
}

export { CatalogHeaderSearch, SEARCH_DEBOUNCE_MS };
export type { SearchClock };
