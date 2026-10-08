import type { FeedPath, FeedStep } from '../domain/remote-publication';

type FeedPosition = {
  readonly path: FeedPath;
  readonly url: string | null;
  readonly ids: readonly string[];
};

type Crumb = { readonly label: string; readonly depth: number };

const ROOT_POSITION: FeedPosition = { path: [], url: null, ids: [''] };

const SEARCH_PLACEHOLDER = '{searchTerms}';

function searchUrl(template: string, query: string): string {
  return template.replaceAll(SEARCH_PLACEHOLDER, encodeURIComponent(query.trim()));
}

function searchStep(template: string, query: string): FeedStep {
  return { title: `Search: ${query.trim()}`, href: searchUrl(template, query) };
}

function opened(position: FeedPosition, step: FeedStep): FeedPosition {
  return { path: [...position.path, step], url: step.href, ids: [...position.ids, ''] };
}

function searched(position: FeedPosition, step: FeedStep): FeedPosition {
  return { path: [step], url: step.href, ids: [position.ids[0] ?? '', ''] };
}

function paged(position: FeedPosition, url: string): FeedPosition {
  return { path: position.path, url, ids: position.ids };
}

function identified(position: FeedPosition, feedId: string): FeedPosition {
  const last = position.ids.length - 1;
  const depth = feedId === '' ? -1 : position.ids.slice(0, last).indexOf(feedId);
  if (depth < 0) {
    const ids = position.ids.map((known, index) => (index === last ? feedId : known));
    return { path: position.path, url: position.url, ids };
  }
  const url = position.url;
  const kept = position.path.slice(0, depth);
  const reached = kept.at(-1);
  const path =
    reached === undefined || url === null
      ? kept
      : [...kept.slice(0, -1), { title: reached.title, href: url }];
  return { path, url, ids: position.ids.slice(0, depth + 1) };
}

function atDepth(position: FeedPosition, depth: number): FeedPosition {
  const path = position.path.slice(0, Math.max(0, depth));
  return { path, url: path.at(-1)?.href ?? null, ids: position.ids.slice(0, path.length + 1) };
}

function crumbs(rootName: string, path: FeedPath): readonly Crumb[] {
  const steps = path.map((step, index) => ({ label: step.title, depth: index + 1 }));
  return [{ label: rootName, depth: 0 }, ...steps];
}

export {
  ROOT_POSITION,
  atDepth,
  crumbs,
  identified,
  opened,
  paged,
  searchStep,
  searchUrl,
  searched,
};
export type { Crumb, FeedPosition };
