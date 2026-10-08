import type { CatalogId } from '$lib/shared/ids';

type CatalogAuth =
  | { readonly kind: 'none' }
  | { readonly kind: 'basic'; readonly username: string };

type Catalog = {
  readonly id: CatalogId;
  readonly title: string;
  readonly rootUrl: string;
  readonly auth: CatalogAuth;
};

export type { Catalog, CatalogAuth };
