import { tick } from 'svelte';
import { match } from 'ts-pattern';
import { returnFocus } from '$lib/shared/focus-return';
import type { FocusReturn } from '$lib/shared/focus-return';
import type { CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import { addressKey } from '../domain/catalog-feed';
import type {
  AcquisitionFeed,
  CatalogFeed,
  FeedAddress,
  FeedSearch,
  NavigationFeed,
  NavigationLink,
  TrailStep,
} from '../domain/catalog-feed';
import type { BookOriginLink, RemoteItem } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import type { SearchCatalogResult } from '../use-cases/search-catalog';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { CatalogCovers } from './catalog-covers.svelte';
import type { CatalogDownloads, QueuedDownload } from './catalog-downloads.svelte';
import type { Sought } from './catalog-session.svelte';
import { CatalogSelection } from './catalog-selection.svelte';
import type { BrowseFailure } from './catalog-texts';
import {
  ROOT_POSITION,
  addressed,
  atDepth,
  crumbs,
  identified,
  opened,
  searched,
} from './feed-address';
import type { FeedPosition } from './feed-address';
import { NO_HISTORY } from './library-history';
import type { HistoryMode, HistoryRecorder } from './library-history';
import { publicationFacts, summaryLines } from './publication-facts';
import type { PublicationFact } from './publication-facts';
import type { Scroller } from './scroll-memory';

type BrowseUseCases = {
  readonly browseCatalog: (
    id: CatalogId,
    address: FeedAddress | null,
    path: readonly TrailStep[],
    signal?: AbortSignal,
  ) => Promise<BrowseCatalogResult>;
  readonly searchCatalog: (
    id: CatalogId,
    search: FeedSearch,
    query: string,
    path: readonly TrailStep[],
    signal?: AbortSignal,
  ) => Promise<SearchCatalogResult>;
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
};

type PositionStore = {
  readonly positionOf: (id: CatalogId) => FeedPosition;
  readonly move: (id: CatalogId, position: FeedPosition) => void;
  readonly advance: (id: CatalogId) => void;
  readonly ancestorIndexOf: (id: CatalogId, ancestor: FeedPosition) => number | null;
  readonly seek: (id: CatalogId, index: number) => Sought | null;
  readonly type: (id: CatalogId, query: string) => void;
  readonly pagesOf: (id: CatalogId) => readonly FeedAddress[];
  readonly appendPage: (id: CatalogId, address: FeedAddress) => void;
  readonly selectionOf: (id: CatalogId) => ReadonlySet<string>;
  readonly keepSelection: (id: CatalogId, entryIds: ReadonlySet<string>) => void;
  readonly searchOriginOf: (id: CatalogId) => FeedPosition | null;
  readonly keepSearchOrigin: (id: CatalogId, position: FeedPosition) => void;
  readonly dropSearchOrigin: (id: CatalogId) => void;
  readonly keepScroll: (id: CatalogId, top: number) => void;
  readonly takeScroll: (id: CatalogId) => number;
};

type BrowseState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'navigation'; readonly feed: NavigationFeed }
  | { readonly kind: 'acquisition'; readonly feed: AcquisitionFeed }
  | { readonly kind: 'unlock'; readonly refused: boolean }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type ShowMode = HistoryMode | 'none';

type BrowseCrumb = { readonly label: string; readonly onselect: () => void };

type Paging = { readonly next: FeedAddress | null };

type MoreState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type MoreOutcome =
  | {
      readonly kind: 'appended';
      readonly reading: CatalogFeed;
      readonly held: ReadonlyMap<string, BookOriginLink>;
    }
  | { readonly kind: 'unlock'; readonly refused: boolean }
  | { readonly kind: 'idle' }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type OpenedPublication = {
  readonly publication: RemotePublication;
  readonly item: RemoteItem;
  readonly cover: string | null;
  readonly facts: readonly PublicationFact[];
  readonly summary: readonly string[];
};

const NO_PAGING: Paging = { next: null };

function firstOfEach<T>(items: readonly T[], keyOf: (item: T) => string): readonly T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

class CatalogBrowseView {
  state = $state.raw<BrowseState>({ kind: 'loading' });
  position = $state.raw<FeedPosition>(ROOT_POSITION);
  prompting = $state(true);
  unlocking = $state(false);
  more = $state.raw<MoreState>({ kind: 'idle' });

  readonly catalog: Catalog;
  readonly downloads: CatalogDownloads;
  readonly covers: CatalogCovers;
  readonly selection: CatalogSelection;

  #cases: BrowseUseCases;
  #store: PositionStore;
  #rootSearch = $state<FeedSearch | null>(null);
  #appended = $state.raw<readonly CatalogFeed[]>([]);
  #pending: AbortController | null = null;
  #loadingMore: AbortController | null = null;
  #started = false;
  #openedId = $state<string | null>(null);
  #openedFrom: FocusReturn | null = null;
  #scroller: Scroller | null = null;
  #searchedQuery: string | null = null;
  #history: HistoryRecorder;

  constructor(
    catalog: Catalog,
    cases: BrowseUseCases,
    store: PositionStore,
    downloads: CatalogDownloads,
    covers: CatalogCovers,
    history: HistoryRecorder = NO_HISTORY,
  ) {
    this.#history = history;
    this.catalog = catalog;
    this.downloads = downloads;
    this.covers = covers;
    this.selection = new CatalogSelection(
      downloads,
      () => this.entries,
      (entryIds) => store.keepSelection(catalog.id, entryIds),
    );
    this.#cases = cases;
    this.#store = store;
    this.position = store.positionOf(catalog.id);
  }

  get crumbs(): readonly BrowseCrumb[] {
    return crumbs(this.catalog.title, this.position.path).map(({ label, depth }) => ({
      label,
      onselect: () => void this.goToDepth(depth),
    }));
  }

  get paging(): Paging {
    const last = this.#appended.at(-1);
    if (last !== undefined) return last.feed.paging;
    return match(this.state)
      .returnType<Paging>()
      .with({ kind: 'navigation' }, ({ feed }) => feed.paging)
      .with({ kind: 'acquisition' }, ({ feed }) => feed.paging)
      .with({ kind: 'loading' }, { kind: 'unlock' }, { kind: 'failed' }, () => NO_PAGING)
      .exhaustive();
  }

  get feedSearch(): FeedSearch | null {
    const own = match(this.state)
      .returnType<FeedSearch | null>()
      .with({ kind: 'navigation' }, ({ feed }) => feed.search)
      .with({ kind: 'acquisition' }, ({ feed }) => feed.search)
      .with({ kind: 'loading' }, { kind: 'unlock' }, { kind: 'failed' }, () => null)
      .exhaustive();
    return own ?? this.#rootSearch;
  }

  get links(): readonly NavigationLink[] {
    const links = [this.state, ...this.#appended].flatMap((page) =>
      page.kind === 'navigation' ? page.feed.links : [],
    );
    return firstOfEach(links, (link) => addressKey(link.address));
  }

  get entries(): readonly QueuedDownload[] {
    const publications = [this.state, ...this.#appended].flatMap((page) =>
      page.kind === 'acquisition' ? page.feed.publications : [],
    );
    return firstOfEach(publications, (publication) => publication.entryId).map(
      (publication, index) => ({ publication, feedPosition: index }),
    );
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

  start(): Promise<void> {
    if (this.#started) return Promise.resolve();
    this.#started = true;
    return this.load();
  }

  async load(): Promise<void> {
    const saved = this.#store.pagesOf(this.catalog.id);
    const chosen = this.#store.selectionOf(this.catalog.id);
    const top = this.#store.takeScroll(this.catalog.id);
    await this.#show(this.position, 'none');
    this.selection.restore(chosen);
    const shown = this.#pending;
    for (const address of saved) {
      if (this.#pending !== shown) return;
      if (!(await this.#appendPage(address))) break;
    }
    if (this.#pending === shown) await this.#scrollBack(top);
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

  openLink(link: NavigationLink): Promise<void> {
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    return this.#show(opened(this.position, { title: link.title, address: link.address }), 'push');
  }

  goToDepth(depth: number): Promise<void> {
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    const ancestor = atDepth(this.position, depth);
    if (this.#walkedBackTo(ancestor)) return Promise.resolve();
    return this.#show(ancestor, 'replace');
  }

  async loadMore(): Promise<void> {
    const address = this.paging.next;
    if (address === null) return;
    await this.#appendPage(address);
  }

  search(query: string): Promise<void> {
    const search = this.feedSearch;
    if (query.trim() === '') return this.#leaveSearch();
    if (search === null) return Promise.resolve();
    if (this.#searchedQuery === query.trim() && this.state.kind !== 'failed') {
      return Promise.resolve();
    }
    this.#searchedQuery = query.trim();
    const entering = this.#store.searchOriginOf(this.catalog.id) === null;
    if (entering) this.#store.keepSearchOrigin(this.catalog.id, this.position);
    return this.#show(searched(this.position, { search, query }), entering ? 'push' : 'replace');
  }

  async unlock(password: string): Promise<void> {
    this.unlocking = true;
    this.#cases.unlockCatalog(this.catalog.id, password);
    this.prompting = false;
    await this.load();
    this.unlocking = false;
  }

  dismissPrompt(): void {
    this.prompting = false;
  }

  askPassword(): void {
    this.prompting = true;
  }

  dispose(): void {
    this.#pending?.abort();
    this.#loadingMore?.abort();
    this.covers.clear();
    this.downloads.dispose();
  }

  #leaveSearch(): Promise<void> {
    const origin = this.#store.searchOriginOf(this.catalog.id);
    if (origin === null) return Promise.resolve();
    this.#store.dropSearchOrigin(this.catalog.id);
    this.#searchedQuery = null;
    if (this.#walkedBackTo(origin)) return Promise.resolve();
    return this.#show(origin, 'replace');
  }

  #walkedBackTo(ancestor: FeedPosition): boolean {
    const index = this.#store.ancestorIndexOf(this.catalog.id, ancestor);
    return index !== null && this.#history.walkedBack(this.catalog.id, index);
  }

  restoreFeed(index: number): Promise<void> {
    const sought = this.#store.seek(this.catalog.id, index);
    if (sought === null) return Promise.resolve();
    const { position, before } = sought;
    const { lookup } = position;
    this.#searchedQuery = lookup === null ? null : lookup.query.trim();
    if (lookup === null) this.#store.dropSearchOrigin(this.catalog.id);
    else this.#store.keepSearchOrigin(this.catalog.id, before ?? ROOT_POSITION);
    this.#store.type(this.catalog.id, lookup === null ? '' : lookup.query);
    return this.#show(position, 'none');
  }

  #hideDetails(): void {
    this.#openedId = null;
    returnFocus(this.#openedFrom);
    this.#openedFrom = null;
  }

  #openedEntry(): QueuedDownload | undefined {
    return this.entries.find(({ publication }) => publication.entryId === this.#openedId);
  }

  async #scrollBack(top: number): Promise<void> {
    if (top <= 0) return;
    await tick();
    this.#scroller?.scrollTo(top);
  }

  async #show(position: FeedPosition, mode: ShowMode): Promise<void> {
    this.#pending?.abort();
    this.#loadingMore?.abort();
    this.#loadingMore = null;
    const pending = new AbortController();
    this.#pending = pending;
    this.#appended = [];
    this.selection.reset();
    this.#openedId = null;
    this.more = { kind: 'idle' };
    this.position = position;
    if (mode === 'push') this.#store.advance(this.catalog.id);
    this.#store.move(this.catalog.id, position);
    if (mode !== 'none') this.#history.moved(this.catalog.id, mode);
    this.covers.clear();
    this.state = { kind: 'loading' };

    const { lookup } = position;
    const result =
      lookup === null
        ? await this.#cases.browseCatalog(
            this.catalog.id,
            position.address,
            position.path,
            pending.signal,
          )
        : await this.#cases.searchCatalog(
            this.catalog.id,
            lookup.search,
            lookup.query,
            position.path,
            pending.signal,
          );
    if (this.#pending !== pending) return;

    this.state = match(result)
      .returnType<BrowseState>()
      .with({ kind: 'success' }, ({ reading }) => reading)
      .with({ kind: 'locked' }, () => ({ kind: 'unlock', refused: false }))
      .with({ kind: 'unauthorized' }, () => ({ kind: 'unlock', refused: true }))
      .with({ kind: 'aborted' }, () => ({ kind: 'loading' }))
      .with(
        { kind: 'not-a-catalog' },
        { kind: 'not-found' },
        { kind: 'server-error' },
        { kind: 'blocked' },
        { kind: 'offline' },
        { kind: 'unknown-catalog' },
        { kind: 'unreadable-catalog' },
        { kind: 'storage-unavailable' },
        (failure) => ({ kind: 'failed', failure }),
      )
      .exhaustive();

    if (this.state.kind === 'unlock') this.prompting = true;
    if (result.kind !== 'success') return;
    const settled = lookup === null ? position : addressed(position, result.reading.feed.address);
    const identity = identified(settled, result.reading.feed.id);
    this.position = identity;
    this.#store.move(this.catalog.id, identity);
    if (position.address === null && lookup === null) this.#rootSearch = result.reading.feed.search;
    this.#shown(result.held);
  }

  async #appendPage(address: FeedAddress): Promise<boolean> {
    const first = this.state.kind;
    if (first !== 'navigation' && first !== 'acquisition') return false;
    if (this.more.kind === 'loading') return false;
    this.more = { kind: 'loading' };
    const loading = new AbortController();
    this.#loadingMore = loading;

    const result = await this.#cases.browseCatalog(
      this.catalog.id,
      address,
      this.position.path,
      loading.signal,
    );
    if (this.#loadingMore !== loading) return false;
    this.#loadingMore = null;

    const outcome = match(result)
      .returnType<MoreOutcome>()
      .with({ kind: 'success' }, ({ reading, held }) =>
        reading.kind === first
          ? { kind: 'appended', reading, held }
          : { kind: 'failed', failure: { kind: 'not-a-catalog' } },
      )
      .with({ kind: 'locked' }, () => ({ kind: 'unlock', refused: false }))
      .with({ kind: 'unauthorized' }, () => ({ kind: 'unlock', refused: true }))
      .with({ kind: 'aborted' }, () => ({ kind: 'idle' }))
      .with(
        { kind: 'not-a-catalog' },
        { kind: 'not-found' },
        { kind: 'server-error' },
        { kind: 'blocked' },
        { kind: 'offline' },
        { kind: 'unknown-catalog' },
        { kind: 'unreadable-catalog' },
        { kind: 'storage-unavailable' },
        (failure) => ({ kind: 'failed', failure }),
      )
      .exhaustive();

    return match(outcome)
      .returnType<boolean>()
      .with({ kind: 'appended' }, ({ reading, held }) => {
        this.#appended = [...this.#appended, reading];
        this.more = { kind: 'idle' };
        this.#store.appendPage(this.catalog.id, address);
        this.downloads.addHeld(held);
        if (reading.kind === 'acquisition') void this.covers.add(reading.feed.publications);
        return true;
      })
      .with({ kind: 'unlock' }, ({ refused }) => {
        this.more = { kind: 'idle' };
        this.state = { kind: 'unlock', refused };
        this.prompting = true;
        return false;
      })
      .with({ kind: 'idle' }, () => {
        this.more = { kind: 'idle' };
        return false;
      })
      .with({ kind: 'failed' }, ({ failure }) => {
        this.more = { kind: 'failed', failure };
        return false;
      })
      .exhaustive();
  }

  #shown(held: ReadonlyMap<string, BookOriginLink>): void {
    this.downloads.setHeld(held);
    if (this.state.kind !== 'acquisition') return;
    void this.covers.show(this.state.feed.publications);
  }
}

export { CatalogBrowseView };
export type {
  BrowseCrumb,
  BrowseState,
  BrowseUseCases,
  MoreState,
  OpenedPublication,
  Paging,
  PositionStore,
};
