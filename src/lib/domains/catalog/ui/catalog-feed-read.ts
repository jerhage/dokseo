import { match } from 'ts-pattern';
import type { MoreState, PagedProblem, PagedReadState, Total } from '$lib/shared/read-paged-state';
import type { ReadState } from '$lib/shared/read-state';
import { addressKey, linksOf, publicationsOf } from '../domain/catalog-feed';
import type { FeedEntry, FeedHead, NavigationLink } from '../domain/catalog-feed';
import type { BookOriginLink } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import type { FeedProblem } from '../queries/catalog-feed-queries';
import type { HeldOriginsResult } from '../use-cases/held-origins';
import type { QueuedDownload } from './catalog-downloads.svelte';

type FeedState = PagedReadState<FeedEntry, FeedProblem>;

type FeedActions = {
  loadMore(): void;
  refresh(): void;
  reload(): void;
};

type CatalogFeedRead = FeedActions & {
  readonly state: FeedState;
  readonly head: FeedHead | null;
  readonly held: ReadonlyMap<string, BookOriginLink>;
  readonly covers: ReadonlyMap<string, Blob>;
};

type ReadyFeed = FeedActions & {
  readonly head: FeedHead;
  readonly items: readonly FeedEntry[];
  readonly total: Total;
  readonly more: MoreState<FeedProblem>;
  readonly refreshing: boolean;
};

type FeedLock = { readonly refused: boolean };

type FeedListing = {
  readonly links: readonly NavigationLink[];
  readonly publications: readonly QueuedDownload[];
};

const NOTHING_TO_DO = (): void => undefined;

const LOADING_FEED: CatalogFeedRead = {
  state: { kind: 'loading' },
  head: null,
  held: new Map(),
  covers: new Map(),
  loadMore: NOTHING_TO_DO,
  refresh: NOTHING_TO_DO,
  reload: NOTHING_TO_DO,
};

const NO_LISTING: FeedListing = { links: [], publications: [] };

const NO_HELD: ReadonlyMap<string, BookOriginLink> = new Map();

type CoverTarget = { readonly href: string };

function heldOf(state: ReadState<HeldOriginsResult>): ReadonlyMap<string, BookOriginLink> {
  if (state.kind !== 'ready' || state.value.kind !== 'success') return NO_HELD;
  return state.value.held;
}

function coverTargetsOf(publications: readonly RemotePublication[]): readonly CoverTarget[] {
  const hrefs = new Set<string>();
  for (const publication of publications) {
    if (publication.cover !== null) hrefs.add(publication.cover.href);
  }
  return [...hrefs].map((href) => ({ href }));
}

function coverBlobsOf(
  publications: readonly RemotePublication[],
  targets: readonly CoverTarget[],
  blobs: readonly (Blob | undefined)[],
): ReadonlyMap<string, Blob> {
  const byHref = new Map<string, Blob>();
  targets.forEach((target, index) => {
    const blob = blobs[index];
    if (blob !== undefined) byHref.set(target.href, blob);
  });
  const covers = new Map<string, Blob>();
  for (const publication of publications) {
    const blob = publication.cover === null ? undefined : byHref.get(publication.cover.href);
    if (blob !== undefined) covers.set(publication.entryId, blob);
  }
  return covers;
}

function lockFor(problem: PagedProblem<FeedProblem>): FeedLock | null {
  if (problem.kind === 'locked') return { refused: false };
  if (problem.kind === 'unauthorized') return { refused: true };
  return null;
}

function lockOf(state: FeedState): FeedLock | null {
  return match(state)
    .returnType<FeedLock | null>()
    .with({ kind: 'loading' }, () => null)
    .with({ kind: 'failed' }, ({ failure }) => lockFor(failure))
    .with({ kind: 'ready', more: { kind: 'failed' } }, ({ more }) => lockFor(more.failure))
    .with({ kind: 'ready' }, () => null)
    .exhaustive();
}

function readyFeedOf(read: CatalogFeedRead): ReadyFeed | null {
  const { state, head } = read;
  if (state.kind !== 'ready' || head === null) return null;
  return {
    head,
    items: state.items,
    total: state.total,
    more: state.more,
    refreshing: state.refreshing,
    loadMore: () => read.loadMore(),
    refresh: () => read.refresh(),
    reload: () => read.reload(),
  };
}

function firstOfEach<T>(items: readonly T[], keyOf: (item: T) => string): readonly T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listingOf(entries: readonly FeedEntry[]): FeedListing {
  const links = firstOfEach(linksOf(entries), (link) => addressKey(link.address));
  const publications = firstOfEach(publicationsOf(entries), (publication) => publication.entryId);
  return {
    links,
    publications: publications.map((publication, index) => ({ publication, feedPosition: index })),
  };
}

export {
  LOADING_FEED,
  NO_LISTING,
  coverBlobsOf,
  coverTargetsOf,
  heldOf,
  listingOf,
  lockOf,
  readyFeedOf,
};
export type {
  CatalogFeedRead,
  CoverTarget,
  FeedActions,
  FeedListing,
  FeedLock,
  FeedState,
  ReadyFeed,
};
