import { match } from 'ts-pattern';
import type { CatalogId } from '$lib/shared/ids';
import type { Catalog } from '../domain/catalog';
import type { AcquisitionFeed, NavigationFeed, NavigationLink } from '../domain/opds-feed';
import type { BookOriginLink } from '../domain/remote-item';
import type { FeedPath } from '../domain/remote-publication';
import type { BrowseCatalogResult } from '../use-cases/browse-catalog';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import type { CatalogCovers } from './catalog-covers.svelte';
import type { CatalogDownloads, QueuedDownload } from './catalog-downloads.svelte';
import type { BrowseFailure } from './catalog-texts';
import { ROOT_POSITION, atDepth, crumbs, opened, searchStep, searched } from './feed-address';
import type { FeedPosition } from './feed-address';

type BrowseUseCases = {
  readonly browseCatalog: (
    id: CatalogId,
    url: string | null,
    path: FeedPath,
    signal?: AbortSignal,
  ) => Promise<BrowseCatalogResult>;
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
};

type PositionStore = {
  readonly positionOf: (id: CatalogId) => FeedPosition;
  readonly move: (id: CatalogId, position: FeedPosition) => void;
  readonly pagesOf: (id: CatalogId) => readonly string[];
  readonly appendPage: (id: CatalogId, url: string) => void;
};

type BrowseState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'navigation'; readonly feed: NavigationFeed }
  | { readonly kind: 'acquisition'; readonly feed: AcquisitionFeed }
  | { readonly kind: 'unlock'; readonly refused: boolean }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type BrowseCrumb = { readonly label: string; readonly onselect: () => void };

type Paging = { readonly previous: string | null; readonly next: string | null };

type FeedReading = Extract<BrowseCatalogResult, { readonly kind: 'success' }>['reading'];

type MoreState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type MoreOutcome =
  | {
      readonly kind: 'appended';
      readonly reading: FeedReading;
      readonly held: ReadonlyMap<string, BookOriginLink>;
    }
  | { readonly kind: 'unlock'; readonly refused: boolean }
  | { readonly kind: 'idle' }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

const NO_PAGING: Paging = { previous: null, next: null };

class CatalogBrowseView {
  state = $state.raw<BrowseState>({ kind: 'loading' });
  position = $state.raw<FeedPosition>(ROOT_POSITION);
  prompting = $state(true);
  unlocking = $state(false);
  more = $state.raw<MoreState>({ kind: 'idle' });

  readonly catalog: Catalog;
  readonly downloads: CatalogDownloads;
  readonly covers: CatalogCovers;

  #cases: BrowseUseCases;
  #store: PositionStore;
  #rootSearch = $state<string | null>(null);
  #appended = $state.raw<readonly FeedReading[]>([]);
  #pending: AbortController | null = null;
  #loadingMore: AbortController | null = null;
  #started = false;

  constructor(
    catalog: Catalog,
    cases: BrowseUseCases,
    store: PositionStore,
    downloads: CatalogDownloads,
    covers: CatalogCovers,
  ) {
    this.catalog = catalog;
    this.downloads = downloads;
    this.covers = covers;
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

  get searchTemplate(): string | null {
    const own = match(this.state)
      .returnType<string | null>()
      .with({ kind: 'navigation' }, ({ feed }) => feed.searchTemplate)
      .with({ kind: 'acquisition' }, ({ feed }) => feed.searchTemplate)
      .with({ kind: 'loading' }, { kind: 'unlock' }, { kind: 'failed' }, () => null)
      .exhaustive();
    return own ?? this.#rootSearch;
  }

  get links(): readonly NavigationLink[] {
    return [this.state, ...this.#appended].flatMap((page) =>
      page.kind === 'navigation' ? page.feed.links : [],
    );
  }

  get entries(): readonly QueuedDownload[] {
    return [this.state, ...this.#appended]
      .flatMap((page) => (page.kind === 'acquisition' ? page.feed.publications : []))
      .map((publication, index) => ({ publication, feedPosition: index }));
  }

  start(): Promise<void> {
    if (this.#started) return Promise.resolve();
    this.#started = true;
    return this.load();
  }

  async load(): Promise<void> {
    const saved = this.#store.pagesOf(this.catalog.id);
    await this.#show(this.position);
    const shown = this.#pending;
    for (const url of saved) {
      if (this.#pending !== shown) return;
      if (!(await this.#appendPage(url))) return;
    }
  }

  openLink(link: NavigationLink): Promise<void> {
    return this.#show(opened(this.position, { title: link.title, href: link.href }));
  }

  goToDepth(depth: number): Promise<void> {
    return this.#show(atDepth(this.position, depth));
  }

  async loadMore(): Promise<void> {
    const url = this.paging.next;
    if (url === null) return;
    await this.#appendPage(url);
  }

  search(query: string): Promise<void> {
    const template = this.searchTemplate;
    if (template === null || query.trim() === '') return Promise.resolve();
    return this.#show(searched(searchStep(template, query)));
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

  async #show(position: FeedPosition): Promise<void> {
    this.#pending?.abort();
    this.#loadingMore?.abort();
    this.#loadingMore = null;
    const pending = new AbortController();
    this.#pending = pending;
    this.#appended = [];
    this.more = { kind: 'idle' };
    this.position = position;
    this.#store.move(this.catalog.id, position);
    this.covers.clear();
    this.state = { kind: 'loading' };

    const result = await this.#cases.browseCatalog(
      this.catalog.id,
      position.url,
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
        { kind: 'not-opds' },
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
    if (position.url === null) this.#rootSearch = result.reading.feed.searchTemplate;
    this.#shown(result.held);
  }

  async #appendPage(url: string): Promise<boolean> {
    const first = this.state.kind;
    if (first !== 'navigation' && first !== 'acquisition') return false;
    if (this.more.kind === 'loading') return false;
    this.more = { kind: 'loading' };
    const loading = new AbortController();
    this.#loadingMore = loading;

    const result = await this.#cases.browseCatalog(
      this.catalog.id,
      url,
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
          : { kind: 'failed', failure: { kind: 'not-opds' } },
      )
      .with({ kind: 'locked' }, () => ({ kind: 'unlock', refused: false }))
      .with({ kind: 'unauthorized' }, () => ({ kind: 'unlock', refused: true }))
      .with({ kind: 'aborted' }, () => ({ kind: 'idle' }))
      .with(
        { kind: 'not-opds' },
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
        this.#store.appendPage(this.catalog.id, url);
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
export type { BrowseCrumb, BrowseState, BrowseUseCases, MoreState, Paging, PositionStore };
