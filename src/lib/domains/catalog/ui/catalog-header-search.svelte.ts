import type { Catalog } from '../domain/catalog';
import type { CatalogSession } from './catalog-session.svelte';
import type { CatalogTabsView } from './catalog-tabs.svelte';
import { searchAvailability, searchPlaceholder } from './catalog-search';
import type { HeaderField } from './catalog-search';

class CatalogHeaderSearch {
  #tabs: CatalogTabsView;
  #session: CatalogSession;

  constructor(tabs: CatalogTabsView, session: CatalogSession) {
    this.#tabs = tabs;
    this.#session = session;
  }

  get field(): HeaderField | undefined {
    const catalog = this.#tabs.catalogFor(this.#tabs.selected);
    return catalog === null ? undefined : this.fieldFor(catalog);
  }

  fieldFor(catalog: Catalog): HeaderField {
    const browse = this.#tabs.browsing(catalog);
    const availability = searchAvailability(browse.state.kind !== 'loading', browse.feedSearch);
    return {
      placeholder: searchPlaceholder(catalog.title, availability),
      disabled: availability === 'absent',
      value: this.#session.queryOf(catalog.id),
      oninput: (value) => this.#session.type(catalog.id, value),
      onsubmit: (value) => void browse.search(value),
    };
  }
}

export { CatalogHeaderSearch };
