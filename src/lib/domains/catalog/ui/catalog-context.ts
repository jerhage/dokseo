import { getContext, setContext } from 'svelte';
import type { CatalogDeps } from './catalog-deps';

const CATALOG_DEPS = Symbol('catalog-deps');

function provideCatalogDeps(deps: CatalogDeps): void {
  setContext(CATALOG_DEPS, deps);
}

function useCatalogDeps(): CatalogDeps {
  const deps = getContext<CatalogDeps | undefined>(CATALOG_DEPS);
  if (deps === undefined) throw new Error('No catalog dependencies in context.');
  return deps;
}

export { provideCatalogDeps, useCatalogDeps };
