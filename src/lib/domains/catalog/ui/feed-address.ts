import type { FeedPath, FeedStep } from '../domain/remote-publication';

type FeedPosition = { readonly path: FeedPath; readonly url: string | null };

type Crumb = { readonly label: string; readonly href: string };

const ROOT_POSITION: FeedPosition = { path: [], url: null };

const SEARCH_PLACEHOLDER = '{searchTerms}';

const CRUMB_PREFIX = '#depth-';

function searchUrl(template: string, query: string): string {
  return template.replaceAll(SEARCH_PLACEHOLDER, encodeURIComponent(query.trim()));
}

function searchStep(template: string, query: string): FeedStep {
  return { title: `Search: ${query.trim()}`, href: searchUrl(template, query) };
}

function opened(position: FeedPosition, step: FeedStep): FeedPosition {
  return { path: [...position.path, step], url: step.href };
}

function searched(step: FeedStep): FeedPosition {
  return { path: [step], url: step.href };
}

function paged(position: FeedPosition, url: string): FeedPosition {
  return { path: position.path, url };
}

function atDepth(position: FeedPosition, depth: number): FeedPosition {
  const path = position.path.slice(0, Math.max(0, depth));
  return { path, url: path.at(-1)?.href ?? null };
}

function crumbs(rootName: string, path: FeedPath): readonly Crumb[] {
  const steps = path.map((step, index) => ({
    label: step.title,
    href: `${CRUMB_PREFIX}${index + 1}`,
  }));
  return [{ label: rootName, href: `${CRUMB_PREFIX}0` }, ...steps];
}

function crumbDepth(href: string): number | null {
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : href;
  if (!hash.startsWith(CRUMB_PREFIX)) return null;
  const digits = hash.slice(CRUMB_PREFIX.length);
  return /^\d+$/u.test(digits) ? Number.parseInt(digits, 10) : null;
}

export {
  ROOT_POSITION,
  atDepth,
  crumbDepth,
  crumbs,
  opened,
  paged,
  searchStep,
  searchUrl,
  searched,
};
export type { Crumb, FeedPosition };
