const CATALOG_PROTOCOLS = ['opds1'] as const;

type CatalogProtocol = (typeof CATALOG_PROTOCOLS)[number];

const DEFAULT_CATALOG_PROTOCOL: CatalogProtocol = 'opds1';

function isCatalogProtocol(value: unknown): value is CatalogProtocol {
  return CATALOG_PROTOCOLS.some((protocol) => protocol === value);
}

export { CATALOG_PROTOCOLS, DEFAULT_CATALOG_PROTOCOL, isCatalogProtocol };
export type { CatalogProtocol };
