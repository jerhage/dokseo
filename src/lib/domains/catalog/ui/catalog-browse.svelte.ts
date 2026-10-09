import { tick } from 'svelte';
import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';
import type { CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import { ROOT_LOCATION } from '../domain/catalog-feed';
import type { FeedHead, FeedLocation, FeedSearch, NavigationLink } from '../domain/catalog-feed';
import type { RemoteItem } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { CatalogCovers } from './catalog-covers';
import type { CatalogDownloads, QueuedDownload } from './catalog-downloads.svelte';
import type { CatalogFeedBinding, ReadFeed } from './catalog-feed-binding.svelte';
import { NO_LISTING, listingOf } from './catalog-feed-read';
import type { Sought } from './catalog-session.svelte';
import { CatalogSelection } from './catalog-selection.svelte';
import {
  ROOT_POSITION,
  atDepth,
  crumbs,
  locationOf,
  opened,
  readingKey,
  samePosition,
  searched,
  settled,
} from './feed-address';
import type { FeedPosition } from './feed-address';
import { NO_HISTORY } from './library-history';
import type { HistoryMode, HistoryRecorder } from './library-history';
import { publicationFacts, summaryLines } from './publication-facts';
import type { PublicationFact } from './publication-facts';
import type { Scroller } from './scroll-memory';

type BrowseUseCases = {
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
  readonly forgetDanglingOrigins: (id: CatalogId) => Promise<unknown>;
};

type PositionStore = {
  readonly positionOf: (id: CatalogId) => FeedPosition;
  readonly move: (id: CatalogId, position: FeedPosition) => void;
  readonly settle: (id: CatalogId, position: FeedPosition) => void;
  readonly advance: (id: CatalogId) => void;
  readonly ancestorIndexOf: (id: CatalogId, ancestor: FeedPosition) => number | null;
  readonly seek: (id: CatalogId, index: number) => Sought | null;
  readonly type: (id: CatalogId, query: string) => void;
  readonly selectionOf: (id: CatalogId) => ReadonlySet<string>;
  readonly keepSelection: (id: CatalogId, entryIds: ReadonlySet<string>) => void;
  readonly searchOriginOf: (id: CatalogId) => FeedPosition | null;
  readonly keepSearchOrigin: (id: CatalogId, position: FeedPosition) => void;
  readonly dropSearchOrigin: (id: CatalogId) => void;
  readonly keepScroll: (id: CatalogId, top: number) => void;
  readonly takeScroll: (id: CatalogId) => number;
};

type ShowMode = HistoryMode | 'none';

type BrowseCrumb = { readonly label: string; readonly onselect: () => void };

type OpenedPublication = {
  readonly publication: RemotePublication;
  readonly item: RemoteItem;
  readonly cover: string | null;
  readonly facts: readonly PublicationFact[];
  readonly summary: readonly string[];
};

class CatalogBrowseView {
  position = $state.raw<FeedPosition>(ROOT_POSITION);
  reading = $state.raw<FeedLocation>(ROOT_LOCATION);

  readonly catalog: Catalog;
  readonly downloads: CatalogDownloads;
  readonly covers: CatalogCovers;
  readonly selection: CatalogSelection;

  #cases: BrowseUseCases;
  #store: PositionStore;
  #feed: CatalogFeedBinding;
  #listing = $derived(this.#listingNow());
  #rootSearch = $state<FeedSearch | null>(null);
  #started = false;
  #openedId = $state<string | null>(null);
  #openedFrom: FocusReturn | null = null;
  #scroller: Scroller | null = null;
  #scrollTop: number;
  #searchedQuery: string | null = null;
  #history: HistoryRecorder;

  constructor(
    catalog: Catalog,
    cases: BrowseUseCases,
    store: PositionStore,
    downloads: CatalogDownloads,
    covers: CatalogCovers,
    feed: CatalogFeedBinding,
    history: HistoryRecorder = NO_HISTORY,
  ) {
    this.#history = history;
    this.catalog = catalog;
    this.downloads = downloads;
    this.covers = covers;
    this.#feed = feed;
    this.selection = new CatalogSelection(
      downloads,
      () => this.entries,
      (entryIds) => store.keepSelection(catalog.id, entryIds),
    );
    this.#cases = cases;
    this.#store = store;
    this.position = store.positionOf(catalog.id);
    this.reading = locationOf(this.position);
    this.selection.restore(store.selectionOf(catalog.id));
    this.#scrollTop = store.takeScroll(catalog.id);
  }

  get crumbs(): readonly BrowseCrumb[] {
    return crumbs(this.catalog.title, this.position.path).map(({ label, depth }) => ({
      label,
      onselect: () => this.goToDepth(depth),
    }));
  }

  get readingKey(): string {
    return readingKey(this.reading);
  }

  get feedSettled(): boolean {
    return this.#feed.current.state.kind !== 'loading';
  }

  get feedSearch(): FeedSearch | null {
    return this.#feed.current.head?.search ?? this.#rootSearch;
  }

  get links(): readonly NavigationLink[] {
    return this.#listing.links;
  }

  get entries(): readonly QueuedDownload[] {
    return this.#listing.publications;
  }

  get opened(): OpenedPublication | null {
    const entry = this.#openedEntry();
    if (entry === undefined) return null;
    const { publication } = entry;
    return {
      publication,
      item: this.downloads.itemFor(publication),
      cover: this.covers.urlOf(publication.entryId),
      facts: publicationFacts(publication),
      summary: summaryLines(publication.summary),
    };
  }

  openDetails(entryId: string, from: FocusReturn | null = null): void {
    this.#openedId = entryId;
    this.#openedFrom = from;
    this.#history.detailOpened(this.catalog.id, entryId);
  }

  closeDetails(): void {
    this.#hideDetails();
    this.#history.detailClosed();
  }

  restoreDetail(entryId: string | null): void {
    if (entryId === null) this.#hideDetails();
    else if (this.entries.some(({ publication }) => publication.entryId === entryId)) {
      this.#openedId = entryId;
    }
  }

  downloadOpened(): void {
    const entry = this.#openedEntry();
    if (entry !== undefined) void this.downloads.start(entry.publication, entry.feedPosition);
  }

  cancelOpened(): void {
    const entry = this.#openedEntry();
    if (entry !== undefined) this.downloads.cancel(entry.publication.entryId);
  }

  replaceOpened(): void {
    const entry = this.#openedEntry();
    if (entry !== undefined) this.downloads.askToReplace(entry.publication, entry.feedPosition);
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    void this.#cases.forgetDanglingOrigins(this.catalog.id);
  }

  headLoaded(head: FeedHead): void {
    const { position } = this;
    const placed = settled(position, head);
    if (!samePosition(position, placed)) {
      this.position = placed;
      this.#store.settle(this.catalog.id, placed);
    }
    if (position.address === null && position.lookup === null) this.#rootSearch = head.search;
    void this.#restoreScroll();
  }

  bindFeed(read: ReadFeed): () => void {
    return this.#feed.bind(read);
  }

  bindScroller(scroller: Scroller): () => void {
    this.#scroller = scroller;
    return () => {
      if (this.#scroller === scroller) this.#scroller = null;
    };
  }

  leave(): void {
    if (this.#scroller === null) return;
    this.#store.keepScroll(this.catalog.id, this.#scroller.read());
  }

  openLink(link: NavigationLink): void {
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    this.#show(opened(this.position, { title: link.title, address: link.address }), 'push');
  }

  goToDepth(depth: number): void {
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    const ancestor = atDepth(this.position, depth);
    if (this.#walkedBackTo(ancestor)) return;
    this.#show(ancestor, 'replace');
  }

  search(query: string): void {
    const search = this.feedSearch;
    if (query.trim() === '') return this.#leaveSearch();
    if (search === null) return;
    if (this.#searchedQuery === query.trim() && this.#feed.current.state.kind !== 'failed') return;
    this.#searchedQuery = query.trim();
    const entering = this.#store.searchOriginOf(this.catalog.id) === null;
    if (entering) this.#store.keepSearchOrigin(this.catalog.id, this.position);
    this.#show(searched(this.position, { search, query }), entering ? 'push' : 'replace');
  }

  unlock(password: string): void {
    this.#cases.unlockCatalog(this.catalog.id, password);
    this.#feed.current.reload();
  }

  dispose(): void {
    this.covers.dispose();
    this.downloads.dispose();
  }

  restoreFeed(index: number): void {
    const sought = this.#store.seek(this.catalog.id, index);
    if (sought === null) return;
    const { position, before } = sought;
    const { lookup } = position;
    this.#searchedQuery = lookup === null ? null : lookup.query.trim();
    if (lookup === null) this.#store.dropSearchOrigin(this.catalog.id);
    else this.#store.keepSearchOrigin(this.catalog.id, before ?? ROOT_POSITION);
    this.#store.type(this.catalog.id, lookup === null ? '' : lookup.query);
    this.#show(position, 'none');
  }

  #listingNow() {
    const state = this.#feed.current.state;
    return state.kind === 'ready' ? listingOf(state.items) : NO_LISTING;
  }

  #leaveSearch(): void {
    const origin = this.#store.searchOriginOf(this.catalog.id);
    if (origin === null) return;
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    if (this.#walkedBackTo(origin)) return;
    this.#show(origin, 'replace');
  }

  #walkedBackTo(ancestor: FeedPosition): boolean {
    const index = this.#store.ancestorIndexOf(this.catalog.id, ancestor);
    return index !== null && this.#history.walkedBack(this.catalog.id, index);
  }

  #hideDetails(): void {
    this.#openedId = null;
    returnFocus(this.#openedFrom);
    this.#openedFrom = null;
  }

  #openedEntry(): QueuedDownload | undefined {
    return this.entries.find(({ publication }) => publication.entryId === this.#openedId);
  }

  async #restoreScroll(): Promise<void> {
    const top = this.#scrollTop;
    if (top <= 0) return;
    this.#scrollTop = 0;
    await tick();
    this.#scroller?.scrollTo(top);
  }

  #show(position: FeedPosition, mode: ShowMode): void {
    this.selection.reset();
    this.#openedId = null;
    this.#scrollTop = 0;
    this.position = position;
    this.reading = locationOf(position);
    if (mode === 'push') this.#store.advance(this.catalog.id);
    this.#store.move(this.catalog.id, position);
    if (mode !== 'none') this.#history.moved(this.catalog.id, mode);
    this.covers.clear();
  }
}

export { CatalogBrowseView };
export type { BrowseCrumb, BrowseUseCases, OpenedPublication, PositionStore };
