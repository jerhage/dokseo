import {
  addRecord,
  deleteRecord,
  getRecord,
  listRecords,
  putRecord,
} from '$lib/platform/idb/connection';
import { isStoredFields, isText } from '$lib/shared/corrupt-row';
import { catalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type {
  RememberedPasswordListing,
  RememberedPasswordRead,
  RememberedPasswordWrite,
  RememberedPasswords,
} from '../domain/remembered-passwords';
import {
  KEY_STORE,
  PASSWORD_STORE,
  catalogPasswordsDatabase,
  passwordsAvailable,
} from './catalog-passwords-database';
import { createPasswordKey, openPassword, sealPassword } from './password-cipher';
import type { SealedPassword } from './password-cipher';

const KEY_ID = 'password-key';

const WRITTEN = { kind: 'success' } as const;

async function unlessUnavailable<T>(work: () => Promise<T>): Promise<T | StorageUnavailable> {
  if (!passwordsAvailable()) return STORAGE_UNAVAILABLE;
  return await work();
}

async function readKey(db: IDBDatabase): Promise<CryptoKey | null> {
  const stored: unknown = await getRecord(db, KEY_STORE, KEY_ID);
  return stored instanceof CryptoKey ? stored : null;
}

async function keyForSealing(db: IDBDatabase): Promise<CryptoKey> {
  const stored = await readKey(db);
  if (stored !== null) return stored;
  const created = await createPasswordKey();
  const added = await addRecord(db, KEY_STORE, created, KEY_ID);
  if (added === 'added') return created;
  const winner = await readKey(db);
  if (winner !== null) return winner;
  await putRecord(db, KEY_STORE, created, KEY_ID);
  return created;
}

function sealedFrom(row: unknown): SealedPassword | null {
  if (!isStoredFields(row)) return null;
  const { iv, ciphertext } = row;
  if (!(iv instanceof Uint8Array) || !(ciphertext instanceof ArrayBuffer)) return null;
  return { iv, ciphertext };
}

function createIndexedDbRememberedPasswords(): RememberedPasswords {
  return {
    read(id: CatalogId): Promise<RememberedPasswordRead> {
      return unlessUnavailable(async (): Promise<RememberedPasswordRead> => {
        const db = await catalogPasswordsDatabase();
        const row: unknown = await getRecord(db, PASSWORD_STORE, id);
        if (row === undefined) return { kind: 'success', password: null };
        const sealed = sealedFrom(row);
        const key = await readKey(db);
        if (sealed === null || key === null) return { kind: 'unreadable', id };
        const opened = await openPassword(key, sealed);
        if (opened.kind === 'unreadable') return { kind: 'unreadable', id };
        return { kind: 'success', password: opened.password };
      });
    },

    remember(id: CatalogId, password: string): Promise<RememberedPasswordWrite> {
      return unlessUnavailable(async (): Promise<RememberedPasswordWrite> => {
        const db = await catalogPasswordsDatabase();
        const key = await keyForSealing(db);
        const { iv, ciphertext } = await sealPassword(key, password);
        await putRecord(db, PASSWORD_STORE, { catalogId: id, iv, ciphertext });
        return WRITTEN;
      });
    },

    forget(id: CatalogId): Promise<RememberedPasswordWrite> {
      return unlessUnavailable(async (): Promise<RememberedPasswordWrite> => {
        await deleteRecord(await catalogPasswordsDatabase(), PASSWORD_STORE, id);
        return WRITTEN;
      });
    },

    list(): Promise<RememberedPasswordListing> {
      return unlessUnavailable(async (): Promise<RememberedPasswordListing> => {
        const rows = await listRecords<unknown>(await catalogPasswordsDatabase(), PASSWORD_STORE);
        const ids = new Set<CatalogId>();
        for (const row of rows) {
          if (isStoredFields(row) && isText(row.catalogId)) ids.add(catalogId(row.catalogId));
        }
        return { kind: 'success', ids };
      });
    },
  };
}

export { createIndexedDbRememberedPasswords };
