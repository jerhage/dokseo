import { catalogFromStored } from '$lib/domains/catalog/domain/stored-catalog';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import { CorruptRow, isStoredFields } from '$lib/shared/corrupt-row';
import type { CatalogId } from '$lib/shared/ids';
import { unreadableData } from './unreadable-data';
import type { UnreadableData } from './unreadable-data';

type CatalogAuthData =
  | { readonly kind: 'none' }
  | { readonly kind: 'basic'; readonly username: string };

type CatalogData = {
  readonly title: string;
  readonly protocol: string;
  readonly rootUrl: string;
  readonly auth: CatalogAuthData;
};

type CatalogFromSyncData = { readonly kind: 'success'; readonly catalog: Catalog } | UnreadableData;

function toSyncCatalogData(catalog: Catalog): CatalogData {
  const auth: CatalogAuthData =
    catalog.auth.kind === 'basic'
      ? { kind: 'basic', username: catalog.auth.username }
      : { kind: 'none' };
  return {
    title: catalog.title,
    protocol: catalog.protocol,
    rootUrl: catalog.rootUrl,
    auth,
  };
}

function refusePassword(holder: unknown): void {
  if (isStoredFields(holder) && Object.hasOwn(holder, 'password')) {
    throw new CorruptRow('catalog', 'password', 'present');
  }
}

function fromSyncCatalogData(data: unknown, recordId: CatalogId): CatalogFromSyncData {
  try {
    if (!isStoredFields(data)) throw new CorruptRow('catalog', 'data', data);
    refusePassword(data);
    refusePassword(data['auth']);
    const catalog = catalogFromStored({ ...data, id: recordId });
    return { kind: 'success', catalog };
  } catch (cause) {
    return unreadableData(cause);
  }
}

export { fromSyncCatalogData, toSyncCatalogData };
export type { CatalogAuthData, CatalogData, CatalogFromSyncData };
