import { CorruptRow, isStoredFields, isText, knownStoredValue } from '$lib/shared/corrupt-row';
import { catalogId, parsedCatalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import type { Catalog, CatalogAuth } from './catalog';

type StoredCatalog = { readonly [Field in keyof Catalog]?: unknown };

type UnreadableCatalog = {
  readonly id: CatalogId;
  readonly stored: StoredCatalog;
};

type StoredCatalogs = {
  readonly catalogs: readonly Catalog[];
  readonly unreadable: readonly UnreadableCatalog[];
};

function catalogField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('catalog', field, value, known);
}

function isKey(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function storedId(value: unknown): CatalogId {
  const id = isText(value) ? parsedCatalogId(value) : null;
  if (id === null) throw new CorruptRow('catalog', 'id', value);
  return id;
}

function storedAuth(value: unknown): CatalogAuth {
  if (!isStoredFields(value)) throw new CorruptRow('catalog', 'auth', value);
  const kind = value['kind'];
  if (kind === 'none') return { kind: 'none' };
  if (kind === 'basic') {
    return {
      kind: 'basic',
      username: catalogField('username', value['username'], isKey),
    };
  }
  throw new CorruptRow('catalog', 'auth kind', kind);
}

function catalogFromStored(stored: StoredCatalog): Catalog {
  return {
    id: storedId(stored.id),
    title: catalogField('title', stored.title, isKey),
    rootUrl: catalogField('root url', stored.rootUrl, isKey),
    auth: storedAuth(stored.auth),
  };
}

function unreadableCatalog(row: StoredCatalog, cause: unknown): UnreadableCatalog {
  if (typeof row.id !== 'string' || row.id.length === 0) throw cause;
  return { id: catalogId(row.id), stored: row };
}

function catalogsFromStored(rows: readonly StoredCatalog[]): StoredCatalogs {
  const catalogs: Catalog[] = [];
  const unreadable: UnreadableCatalog[] = [];
  for (const row of rows) {
    try {
      catalogs.push(catalogFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableCatalog(row, cause));
    }
  }
  return { catalogs, unreadable };
}

function storedCatalogRow(catalog: Catalog): StoredCatalog {
  const auth =
    catalog.auth.kind === 'basic'
      ? { kind: 'basic', username: catalog.auth.username }
      : { kind: 'none' };
  return {
    id: catalog.id,
    title: catalog.title,
    rootUrl: catalog.rootUrl,
    auth,
  };
}

export { catalogFromStored, catalogsFromStored, storedCatalogRow };
export type { StoredCatalog, StoredCatalogs, UnreadableCatalog };
