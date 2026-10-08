import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
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
import { catalogTabs } from './library-tabs';

type CatalogTabsUseCases = BrowseUseCases &
  DownloadsUseCases & {
    readonly listCatalogs: () => Promise<ListCatalogsResult>;
    readonly readCatalogCover: (
      id: Catalog['id'],
      url: string,
      signal?: AbortSignal,
    ) => Promise<ReadCatalogCoverResult>;
  };

type CatalogTabsDeps = DownloadsChoices & {
  readonly cases: CatalogTabsUseCases;
  readonly notify: Notify;
  readonly describeOpenFile: DescribeOpenFile;
  readonly openBook: (id: BookId) => void;
  readonly refreshLibrary: () => Promise<void>;
  readonly objectUrls?: ObjectUrls | undefined;
};

class CatalogTabsView {
  catalogs = $state.raw<readonly Catalog[]>([]);

  #session: CatalogSession;
  #deps: CatalogTabsDeps;
  #browsing = new Map<Catalog['id'], CatalogBrowseView>();

  constructor(session: CatalogSession, deps: CatalogTabsDeps) {
    this.#session = session;
    this.#deps = deps;
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
    this.#session.selected = id;
  }

  async load(): Promise<void> {
    const listed = await this.#deps.cases.listCatalogs();
    const catalogs = listed.kind === 'success' ? listed.catalogs : [];
    for (const catalog of catalogs) this.browsing(catalog);
    this.catalogs = catalogs;
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
        downloaded: (publication, bookId) => this.#announce(publication, bookId),
      },
    );
    const covers = new CatalogCovers(
      (url, signal) => cases.readCatalogCover(catalog.id, url, signal),
      this.#deps.objectUrls,
    );
    return new CatalogBrowseView(catalog, cases, this.#session, downloads, covers);
  }

  #announce(publication: RemotePublication, bookId: BookId): void {
    this.#deps.notify({
      tone: 'success',
      title: `Added ${publication.title}`,
      action: { label: 'Open', run: () => this.#deps.openBook(bookId) },
      duration: ACTION_NOTICE_MS,
    });
    void this.#deps.refreshLibrary();
  }
}

export { CatalogTabsView };
export type { CatalogTabsDeps, CatalogTabsUseCases };
