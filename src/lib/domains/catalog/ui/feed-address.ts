import type { FeedSearch } from '../domain/catalog-feed';
import type { FeedPath, FeedStep } from '../domain/remote-publication';

type SearchLookup = { readonly search: FeedSearch; readonly query: string };

type FeedPosition = {
  readonly path: FeedPath;
  readonly url: string | null;
  readonly ids: readonly string[];
  readonly lookup: SearchLookup | null;
};

type Crumb = { readonly label: string; readonly depth: number };

const ROOT_POSITION: FeedPosition = { path: [], url: null, ids: [''], lookup: null };

function searchStep(query: string): FeedStep {
  return { title: `Search: ${query.trim()}`, href: '' };
}

function opened(position: FeedPosition, step: FeedStep): FeedPosition {
  return {
    path: [...position.path, step],
    url: step.href,
    ids: [...position.ids, ''],
    lookup: null,
  };
}

function searched(position: FeedPosition, lookup: SearchLookup): FeedPosition {
  return {
    path: [searchStep(lookup.query)],
    url: null,
    ids: [position.ids[0] ?? '', ''],
    lookup,
  };
}

function paged(position: FeedPosition, url: string): FeedPosition {
  return { path: position.path, url, ids: position.ids, lookup: null };
}

function addressed(position: FeedPosition, address: string): FeedPosition {
  const last = position.path.length - 1;
  const path = position.path.map((step, index) =>
    index === last ? { title: step.title, href: address } : step,
  );
  return { path, url: address, ids: position.ids, lookup: null };
}

function identified(position: FeedPosition, feedId: string): FeedPosition {
  const last = position.ids.length - 1;
  const depth = feedId === '' ? -1 : position.ids.slice(0, last).indexOf(feedId);
  if (depth < 0) {
    const ids = position.ids.map((known, index) => (index === last ? feedId : known));
    return { path: position.path, url: position.url, ids, lookup: position.lookup };
  }
  const url = position.url;
  const kept = position.path.slice(0, depth);
  const reached = kept.at(-1);
  const path =
    reached === undefined || url === null
      ? kept
      : [...kept.slice(0, -1), { title: reached.title, href: url }];
  return { path, url, ids: position.ids.slice(0, depth + 1), lookup: null };
}

function atDepth(position: FeedPosition, depth: number): FeedPosition {
  const path = position.path.slice(0, Math.max(0, depth));
  return {
    path,
    url: path.at(-1)?.href ?? null,
    ids: position.ids.slice(0, path.length + 1),
    lookup: null,
  };
}

function crumbs(rootName: string, path: FeedPath): readonly Crumb[] {
  const steps = path.map((step, index) => ({ label: step.title, depth: index + 1 }));
  return [{ label: rootName, depth: 0 }, ...steps];
}

export {
  ROOT_POSITION,
  addressed,
  atDepth,
  crumbs,
  identified,
  opened,
  paged,
  searchStep,
  searched,
};
export type { Crumb, FeedPosition, SearchLookup };
