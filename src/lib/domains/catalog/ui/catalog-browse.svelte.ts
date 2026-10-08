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
import {
  ROOT_POSITION,
  atDepth,
  crumbDepth,
  crumbs,
  opened,
  paged,
  searchStep,
  searched,
} from './feed-address';
import type { Crumb, FeedPosition } from './feed-address';

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
};

type BrowseState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'navigation'; readonly feed: NavigationFeed }
  | { readonly kind: 'acquisition'; readonly feed: AcquisitionFeed }
  | { readonly kind: 'unlock'; readonly refused: boolean }
  | { readonly kind: 'failed'; readonly failure: BrowseFailure };

type Paging = { readonly previous: string | null; readonly next: string | null };

const NO_PAGING: Paging = { previous: null, next: null };

class CatalogBrowseView {
  state = $state.raw<BrowseState>({ kind: 'loading' });
  position = $state.raw<FeedPosition>(ROOT_POSITION);
  prompting = $state(true);
  unlocking = $state(false);

  readonly catalog: Catalog;
  readonly downloads: CatalogDownloads;
  readonly covers: CatalogCovers;

  #cases: BrowseUseCases;
  #store: PositionStore;
  #rootSearch = $state<string | null>(null);
  #pending: AbortController | null = null;
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

  get crumbs(): readonly Crumb[] {
    return crumbs(this.catalog.title, this.position.path);
  }

  get paging(): Paging {
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

  get entries(): readonly QueuedDownload[] {
    if (this.state.kind !== 'acquisition') return [];
    return this.state.feed.publications.map((publication, index) => ({
      publication,
      feedPosition: index,
    }));
  }

  start(): Promise<void> {
    if (this.#started) return Promise.resolve();
    this.#started = true;
    return this.load();
  }

  load(): Promise<void> {
    return this.#show(this.position);
  }

  followCrumb(href: string): boolean {
    const depth = crumbDepth(href);
    if (depth === null) return false;
    void this.goToDepth(depth);
    return true;
  }

  openLink(link: NavigationLink): Promise<void> {
    return this.#show(opened(this.position, { title: link.title, href: link.href }));
  }

  goToDepth(depth: number): Promise<void> {
    return this.#show(atDepth(this.position, depth));
  }

  next(): Promise<void> {
    const url = this.paging.next;
    return url === null ? Promise.resolve() : this.#show(paged(this.position, url));
  }

  previous(): Promise<void> {
    const url = this.paging.previous;
    return url === null ? Promise.resolve() : this.#show(paged(this.position, url));
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
    this.covers.clear();
    this.downloads.dispose();
  }

  async #show(position: FeedPosition): Promise<void> {
    this.#pending?.abort();
    const pending = new AbortController();
    this.#pending = pending;
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

  #shown(held: ReadonlyMap<string, BookOriginLink>): void {
    this.downloads.setHeld(held);
    if (this.state.kind !== 'acquisition') return;
    void this.covers.show(this.state.feed.publications);
  }
}

export { CatalogBrowseView };
export type { BrowseState, BrowseUseCases, Paging, PositionStore };
