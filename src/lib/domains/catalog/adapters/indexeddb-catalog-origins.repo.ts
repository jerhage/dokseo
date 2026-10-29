import { match } from 'ts-pattern';
import {
  deleteByIndex,
  deleteByIndexAndWrite,
  deleteRecord,
  getRecord,
  listByIndex,
  listRecords,
  settleMarkers,
  writeRecords,
} from '$lib/platform/idb/connection';
import type { RecordWrite } from '$lib/platform/idb/connection';
import { acceptedWrites, markingWrites } from '$lib/platform/idb/marking-writes';
import { OUTBOX_STORE, RECORD_VERSION_STORE } from '$lib/shared/change-marker';
import type {
  ChangeMarker,
  ChangeTracking,
  PendingMarkers,
  RecordVersion,
  RecordVersions,
  SettledMarker,
} from '$lib/shared/change-marker';
import { isText } from '$lib/shared/corrupt-row';
import { bookId } from '$lib/shared/ids';
import type { BookId, CatalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import { catalogMarker } from '../domain/catalog-marker';
import type {
  CatalogListing,
  CatalogLookup,
  CatalogRepository,
  CatalogWrite,
  RemoteCatalogWrite,
} from '../domain/catalog-repository';
import type { BookOrigin } from '../domain/book-origin';
import type {
  OriginListing,
  OriginLookup,
  OriginRepository,
  OriginWrite,
} from '../domain/origin-repository';
import { catalogFromStored, catalogsFromStored, storedCatalogRow } from '../domain/stored-catalog';
import type { StoredCatalog } from '../domain/stored-catalog';
import { originFromStored, originsFromStored, storedOriginRow } from '../domain/stored-origin';
import type { StoredOrigin } from '../domain/stored-origin';
import {
  CATALOG_STORE,
  ORIGIN_CATALOG_INDEX,
  ORIGIN_ENTRY_INDEX,
  ORIGIN_STORE,
  catalogOriginsDatabase,
  recordsAvailable,
} from './catalog-origins-database';

const WRITTEN = { kind: 'success' } as const;

async function unlessUnavailable<T>(work: () => Promise<T>): Promise<T | StorageUnavailable> {
  if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
  return await work();
}

function displacedBy(origin: BookOrigin, holders: readonly StoredOrigin[]): readonly RecordWrite[] {
  const writes: RecordWrite[] = [];
  for (const holder of holders) {
    if (isText(holder.bookId) && holder.bookId !== origin.bookId) {
      writes.push({ kind: 'delete', store: ORIGIN_STORE, key: holder.bookId });
    }
  }
  return writes;
}

function createCatalogOriginsRepository(
  tracking: ChangeTracking = 'marked',
): CatalogRepository & OriginRepository {
  const listOrigins = (read: () => Promise<StoredOrigin[]>): Promise<OriginListing> =>
    unlessUnavailable(async (): Promise<OriginListing> => {
      const { origins, unreadable } = originsFromStored(await read());
      return { kind: 'success', origins, unreadable };
    });

  return {
    list(): Promise<CatalogListing> {
      return unlessUnavailable(async (): Promise<CatalogListing> => {
        const rows = await listRecords<StoredCatalog>(
          await catalogOriginsDatabase(),
          CATALOG_STORE,
        );
        const { catalogs, unreadable } = catalogsFromStored(rows);
        return { kind: 'success', catalogs, unreadable };
      });
    },

    get(id: CatalogId): Promise<CatalogLookup> {
      return unlessUnavailable(async (): Promise<CatalogLookup> => {
        const row = await getRecord<StoredCatalog>(
          await catalogOriginsDatabase(),
          CATALOG_STORE,
          id,
        );
        if (row === undefined) return { kind: 'success', catalog: null };
        try {
          return { kind: 'success', catalog: catalogFromStored(row) };
        } catch {
          return { kind: 'unreadable', id };
        }
      });
    },

    save(catalog: Catalog): Promise<CatalogWrite> {
      return unlessUnavailable(async (): Promise<CatalogWrite> => {
        await writeRecords(await catalogOriginsDatabase(), [
          { kind: 'put', store: CATALOG_STORE, record: storedCatalogRow(catalog) },
          ...markingWrites(tracking, [catalogMarker(catalog.id, false, Date.now())]),
        ]);
        return WRITTEN;
      });
    },

    remove(id: CatalogId): Promise<CatalogWrite> {
      return unlessUnavailable(async (): Promise<CatalogWrite> => {
        await writeRecords(await catalogOriginsDatabase(), [
          { kind: 'delete', store: CATALOG_STORE, key: id },
          ...markingWrites(tracking, [catalogMarker(id, true, Date.now())]),
        ]);
        return WRITTEN;
      });
    },

    pendingChanges(): Promise<PendingMarkers> {
      return unlessUnavailable(async (): Promise<PendingMarkers> => {
        const markers = await listRecords<ChangeMarker>(
          await catalogOriginsDatabase(),
          OUTBOX_STORE,
        );
        return { kind: 'success', markers };
      });
    },

    settleChanges(settled: readonly SettledMarker[]): Promise<CatalogWrite> {
      return unlessUnavailable(async (): Promise<CatalogWrite> => {
        await settleMarkers(await catalogOriginsDatabase(), settled);
        return WRITTEN;
      });
    },

    recordVersions(): Promise<RecordVersions> {
      return unlessUnavailable(async (): Promise<RecordVersions> => {
        const versions = await listRecords<RecordVersion>(
          await catalogOriginsDatabase(),
          RECORD_VERSION_STORE,
        );
        return { kind: 'success', versions };
      });
    },

    applyRemote(write: RemoteCatalogWrite): Promise<CatalogWrite> {
      return unlessUnavailable(async (): Promise<CatalogWrite> => {
        const db = await catalogOriginsDatabase();
        await match(write)
          .returnType<Promise<void>>()
          .with({ kind: 'save-catalog' }, ({ catalog, accepted }) =>
            writeRecords(db, [
              { kind: 'put', store: CATALOG_STORE, record: storedCatalogRow(catalog) },
              ...acceptedWrites(accepted),
            ]),
          )
          .with({ kind: 'remove-catalog' }, ({ id, accepted }) =>
            deleteByIndexAndWrite(db, ORIGIN_STORE, ORIGIN_CATALOG_INDEX, id, [
              { kind: 'delete', store: CATALOG_STORE, key: id },
              ...acceptedWrites(accepted),
            ]),
          )
          .exhaustive();
        return WRITTEN;
      });
    },

    listAll(): Promise<OriginListing> {
      return listOrigins(async () =>
        listRecords<StoredOrigin>(await catalogOriginsDatabase(), ORIGIN_STORE),
      );
    },

    listByCatalog(catalogId: CatalogId): Promise<OriginListing> {
      return listOrigins(async () =>
        listByIndex<StoredOrigin>(
          await catalogOriginsDatabase(),
          ORIGIN_STORE,
          ORIGIN_CATALOG_INDEX,
          catalogId,
        ),
      );
    },

    async find(catalogId: CatalogId, entryId: string): Promise<OriginLookup> {
      return await unlessUnavailable(async (): Promise<OriginLookup> => {
        const [row] = await listByIndex<StoredOrigin>(
          await catalogOriginsDatabase(),
          ORIGIN_STORE,
          ORIGIN_ENTRY_INDEX,
          [catalogId, entryId],
        );
        if (row === undefined) return { kind: 'success', origin: null };
        try {
          return { kind: 'success', origin: originFromStored(row) };
        } catch (cause) {
          if (!isText(row.bookId) || row.bookId.length === 0) throw cause;
          return { kind: 'unreadable', bookId: bookId(row.bookId) };
        }
      });
    },

    async findByBook(id: BookId): Promise<OriginLookup> {
      return await unlessUnavailable(async (): Promise<OriginLookup> => {
        const row = await getRecord<StoredOrigin>(await catalogOriginsDatabase(), ORIGIN_STORE, id);
        if (row === undefined) return { kind: 'success', origin: null };
        try {
          return { kind: 'success', origin: originFromStored(row) };
        } catch {
          return { kind: 'unreadable', bookId: id };
        }
      });
    },

    put(origin: BookOrigin): Promise<OriginWrite> {
      return unlessUnavailable(async (): Promise<OriginWrite> => {
        const db = await catalogOriginsDatabase();
        const holders = await listByIndex<StoredOrigin>(db, ORIGIN_STORE, ORIGIN_ENTRY_INDEX, [
          origin.catalogId,
          origin.entryId,
        ]);
        await writeRecords(db, [
          ...displacedBy(origin, holders),
          { kind: 'put', store: ORIGIN_STORE, record: storedOriginRow(origin) },
        ]);
        return WRITTEN;
      });
    },

    deleteByBook(id: BookId): Promise<OriginWrite> {
      return unlessUnavailable(async (): Promise<OriginWrite> => {
        await deleteRecord(await catalogOriginsDatabase(), ORIGIN_STORE, id);
        return WRITTEN;
      });
    },

    deleteByCatalog(catalogId: CatalogId): Promise<OriginWrite> {
      return unlessUnavailable(async (): Promise<OriginWrite> => {
        await deleteByIndex(
          await catalogOriginsDatabase(),
          ORIGIN_STORE,
          ORIGIN_CATALOG_INDEX,
          catalogId,
        );
        return WRITTEN;
      });
    },
  };
}

export { createCatalogOriginsRepository };
