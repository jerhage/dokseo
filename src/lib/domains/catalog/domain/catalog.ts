import type { CatalogId } from '$lib/shared/ids';
import type { CatalogProtocol } from './catalog-protocol';

type CatalogAuth =
  | { readonly kind: 'none' }
  | { readonly kind: 'basic'; readonly username: string };

type Catalog = {
  readonly id: CatalogId;
  readonly title: string;
  readonly protocol: CatalogProtocol;
  readonly rootUrl: string;
  readonly auth: CatalogAuth;
};

export type { Catalog, CatalogAuth };
