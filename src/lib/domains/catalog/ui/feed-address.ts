import type { FeedAddress, FeedSearch, TrailStep } from '../domain/catalog-feed';

type SearchLookup = { readonly search: FeedSearch; readonly query: string };

type FeedPosition = {
  readonly path: readonly TrailStep[];
  readonly address: FeedAddress | null;
  readonly ids: readonly string[];
  readonly lookup: SearchLookup | null;
};

type Crumb = { readonly label: string; readonly depth: number };

const ROOT_POSITION: FeedPosition = { path: [], address: null, ids: [''], lookup: null };

function searchStep(query: string): TrailStep {
  return { title: `Search: ${query.trim()}`, address: null };
}

function opened(position: FeedPosition, step: TrailStep): FeedPosition {
  return {
    path: [...position.path, step],
    address: step.address,
    ids: [...position.ids, ''],
    lookup: null,
  };
}

function searched(position: FeedPosition, lookup: SearchLookup): FeedPosition {
  return {
    path: [searchStep(lookup.query)],
    address: null,
    ids: [position.ids[0] ?? '', ''],
    lookup,
  };
}

function addressed(position: FeedPosition, address: FeedAddress): FeedPosition {
  const last = position.path.length - 1;
  const path = position.path.map((step, index) =>
    index === last ? { title: step.title, address } : step,
  );
  return { path, address, ids: position.ids, lookup: null };
}

function identified(position: FeedPosition, feedId: string): FeedPosition {
  const last = position.ids.length - 1;
  const depth = feedId === '' ? -1 : position.ids.slice(0, last).indexOf(feedId);
  if (depth < 0) {
    const ids = position.ids.map((known, index) => (index === last ? feedId : known));
    return { path: position.path, address: position.address, ids, lookup: position.lookup };
  }
  const address = position.address;
  const kept = position.path.slice(0, depth);
  const reached = kept.at(-1);
  const path =
    reached === undefined || address === null
      ? kept
      : [...kept.slice(0, -1), { title: reached.title, address }];
  return { path, address, ids: position.ids.slice(0, depth + 1), lookup: null };
}

function atDepth(position: FeedPosition, depth: number): FeedPosition {
  const path = position.path.slice(0, Math.max(0, depth));
  return {
    path,
    address: path.at(-1)?.address ?? null,
    ids: position.ids.slice(0, path.length + 1),
    lookup: null,
  };
}

function crumbs(rootName: string, path: readonly TrailStep[]): readonly Crumb[] {
  const steps = path.map((step, index) => ({ label: step.title, depth: index + 1 }));
  return [{ label: rootName, depth: 0 }, ...steps];
}

export { ROOT_POSITION, addressed, atDepth, crumbs, identified, opened, searchStep, searched };
export type { Crumb, FeedPosition, SearchLookup };
