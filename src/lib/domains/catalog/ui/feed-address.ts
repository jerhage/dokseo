import type { FeedPath, FeedStep } from '../domain/remote-publication';

type FeedPosition = { readonly path: FeedPath; readonly url: string | null };

type Crumb = { readonly label: string; readonly depth: number };

const ROOT_POSITION: FeedPosition = { path: [], url: null };

const SEARCH_PLACEHOLDER = '{searchTerms}';

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
  const steps = path.map((step, index) => ({ label: step.title, depth: index + 1 }));
  return [{ label: rootName, depth: 0 }, ...steps];
}

export { ROOT_POSITION, atDepth, crumbs, opened, paged, searchStep, searchUrl, searched };
export type { Crumb, FeedPosition };
