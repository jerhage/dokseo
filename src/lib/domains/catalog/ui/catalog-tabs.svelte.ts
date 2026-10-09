import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import type { ReadState } from '$lib/shared/read-state';
import type { TabItem } from '$lib/ui/components/tabs';
import { shownTab } from '$lib/ui/components/tabs';
import type { Catalog } from '../domain/catalog';
import type { RemotePublication } from '../domain/remote-publication';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ReadCatalogCoverResult } from '../use-cases/read-catalog-cover';
import { CatalogBrowseView } from './catalog-browse.svelte';
import type { BrowseUseCases } from './catalog-browse.svelte';
import { CatalogCovers } from './catalog-covers.svelte';
import type { ObjectUrls } from './catalog-covers.svelte';
import { CatalogDownloads } from './catalog-downloads.svelte';
import type { DownloadsChoices, DownloadsUseCases } from './catalog-downloads.svelte';
import type { CatalogSession } from './catalog-session.svelte';
import type { DescribeOpenFile } from './catalog-texts';
import { listedCatalogs } from './catalog-list';
import { NO_HISTORY } from './library-history';
import type { HistoryRecorder } from './library-history';
import { catalogTabs } from './library-tabs';

type CatalogTabsUseCases = BrowseUseCases &
  DownloadsUseCases & {
    readonly readCatalogCover: (
      id: Catalog['id'],
      url: string,
      signal?: AbortSignal,
    ) => Promise<ReadCatalogCoverResult>;
  };

type CatalogTabsDeps = DownloadsChoices & {
  readonly cases: CatalogTabsUseCases;
  readonly catalogs: () => ReadState<ListCatalogsResult>;
  readonly notify: Notify;
  readonly describeOpenFile: DescribeOpenFile;
  readonly openBook: (id: BookId) => void;
  readonly refreshLibrary: () => Promise<void>;
  readonly objectUrls?: ObjectUrls | undefined;
  readonly history?: HistoryRecorder | undefined;
};

class CatalogTabsView {
  #reached = $state.raw<ReadonlySet<string>>(new Set());
  #session: CatalogSession;
  #deps: CatalogTabsDeps;
  #history: HistoryRecorder;
  #browsing = new Map<Catalog['id'], CatalogBrowseView>();
  #listed: readonly Catalog[];

  constructor(session: CatalogSession, deps: CatalogTabsDeps) {
    this.#session = session;
    this.#deps = deps;
    this.#listed = $derived(listedCatalogs(deps.catalogs()));
    this.#history = deps.history ?? NO_HISTORY;
  }

  get catalogs(): readonly Catalog[] {
    return this.#listed;
  }

  get visible(): boolean {
    return this.catalogs.length > 0;
  }

  get tabs(): readonly TabItem[] {
    return catalogTabs(this.catalogs);
  }

  get selected(): string {
    return shownTab(this.tabs, this.#session.selected) ?? this.#session.selected;
  }

  select(id: string): void {
    this.restoreTab(id);
    this.#history.moved(id, 'replace');
  }

  restoreTab(id: string): void {
    this.#reached = new Set(this.#reached).add(this.selected);
    this.#session.selected = id;
  }

  feedIndex(tabId: string): number {
    const catalog = this.catalogFor(tabId);
    return catalog === null ? 0 : this.#session.trailIndexOf(catalog.id);
  }

  restoreFeed(tabId: string, index: number): void {
    const catalog = this.catalogFor(tabId);
    if (catalog !== null) void this.browsing(catalog).restoreFeed(index);
  }

  restoreDetail(tabId: string, entryId: string | null): void {
    for (const [id, view] of this.#browsing) view.restoreDetail(id === tabId ? entryId : null);
  }

  hasBeenShown(tabId: string): boolean {
    return tabId === this.selected || this.#reached.has(tabId);
  }

  catalogFor(tabId: string): Catalog | null {
    return this.catalogs.find((catalog) => catalog.id === tabId) ?? null;
  }

  browsing(catalog: Catalog): CatalogBrowseView {
    const existing = this.#browsing.get(catalog.id);
    if (existing !== undefined) return existing;
    const created = this.#create(catalog);
    this.#browsing.set(catalog.id, created);
    return created;
  }

  leave(): void {
    const catalog = this.catalogFor(this.selected);
    if (catalog !== null) this.#browsing.get(catalog.id)?.leave();
  }

  dispose(): void {
    for (const view of this.#browsing.values()) view.dispose();
    this.#browsing.clear();
  }

  #create(catalog: Catalog): CatalogBrowseView {
    const { cases } = this.#deps;
    const downloads = new CatalogDownloads(
      cases,
      { matching: this.#deps.matching, defaults: this.#deps.defaults },
      {
        describeOpenFile: this.#deps.describeOpenFile,
        downloaded: (publication, bookId) => this.#announce('Added', publication, bookId),
        updated: (publication, bookId) => this.#announce('Updated', publication, bookId),
      },
    );
    const covers = new CatalogCovers(
      (url, signal) => cases.readCatalogCover(catalog.id, url, signal),
      this.#deps.objectUrls,
    );
    return new CatalogBrowseView(catalog, cases, this.#session, downloads, covers, this.#history);
  }

  #announce(verb: 'Added' | 'Updated', publication: RemotePublication, bookId: BookId): void {
    this.#deps.notify({
      tone: 'success',
      title: `${verb} ${publication.title}`,
      action: { label: 'Open', run: () => this.#deps.openBook(bookId) },
      duration: ACTION_NOTICE_MS,
    });
    void this.#deps.refreshLibrary();
  }
}

export { CatalogTabsView };
export type { CatalogTabsDeps, CatalogTabsUseCases };
