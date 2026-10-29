import { describe, expect, it } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { CatalogId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { BookOrigin } from '../domain/book-origin';
import type { Catalog } from '../domain/catalog';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { OriginRepository } from '../domain/origin-repository';
import { fakePasswords } from './fake-passwords';
import { fakeRememberedPasswords } from './fake-remembered-passwords';
import { addCatalog } from './add-catalog';
import { editCatalog } from './edit-catalog';
import { findOrigin } from './find-origin';
import { listCatalogOrigins } from './list-catalog-origins';
import { listCatalogs } from './list-catalogs';
import { listOrigins } from './list-origins';
import { recordOrigin } from './record-origin';
import { removeCatalog } from './remove-catalog';
import { forgetCatalogPassword } from './forget-catalog-password';
import { listRememberedPasswords } from './list-remembered-passwords';
import { applyRemoteCatalogRemoval } from './apply-remote-catalog-removal';
import { applyRemoteOrigin } from './apply-remote-origin';
import { unlockCatalog } from './unlock-catalog';

type Fault = 'none' | 'unavailable' | 'unreadable';

const NONE = { kind: 'none' } as const;

const CALIBRE = catalogId('calibre');
const OTHER = catalogId('other');

function catalog(id: CatalogId): Catalog {
  return {
    id,
    title: `Title ${id}`,
    protocol: 'opds1' as const,
    rootUrl: `https://${id}.example/opds`,
    auth: NONE,
  };
}

function origin(book: string, owner: CatalogId, entry: string): BookOrigin {
  return {
    bookId: bookId(book),
    catalogId: owner,
    entryId: entry,
    acquisition: { href: 'https://x.example/1', format: 'epub', mediaType: 'x', length: null },
    updated: '2026-10-01T00:00:00Z',
    feedPath: [],
    feedPosition: 0,
    downloadedAt: 1,
  };
}

function fakes(fault: Fault = 'none') {
  const catalogRows = new Map<CatalogId, Catalog>();
  const originRows: BookOrigin[] = [];
  const log: string[] = [];

  const catalogs: CatalogRepository = {
    pendingChanges: () => Promise.resolve({ kind: 'success', markers: [] }),
    settleChanges: () => Promise.resolve({ kind: 'success' }),
    recordVersions: () => Promise.resolve({ kind: 'success', versions: [] }),
    applyRemote: () => Promise.resolve({ kind: 'success' }),
    list: () =>
      Promise.resolve(
        fault === 'unavailable'
          ? STORAGE_UNAVAILABLE
          : { kind: 'success', catalogs: [...catalogRows.values()], unreadable: [] },
      ),
    get: (id) => {
      if (fault === 'unavailable') return Promise.resolve(STORAGE_UNAVAILABLE);
      if (fault === 'unreadable') return Promise.resolve({ kind: 'unreadable', id });
      return Promise.resolve({ kind: 'success', catalog: catalogRows.get(id) ?? null });
    },
    save: (saved) => {
      if (fault === 'unavailable') return Promise.resolve(STORAGE_UNAVAILABLE);
      catalogRows.set(saved.id, saved);
      return Promise.resolve({ kind: 'success' });
    },
    remove: (id) => {
      log.push(`remove ${id}`);
      catalogRows.delete(id);
      return Promise.resolve({ kind: 'success' });
    },
  };

  const origins: OriginRepository = {
    put: (added) => {
      if (fault === 'unavailable') return Promise.resolve(STORAGE_UNAVAILABLE);
      originRows.push(added);
      return Promise.resolve({ kind: 'success' });
    },
    listAll: () => Promise.resolve({ kind: 'success', origins: [...originRows], unreadable: [] }),
    listByCatalog: (id) =>
      Promise.resolve({
        kind: 'success',
        origins: originRows.filter((found) => found.catalogId === id),
        unreadable: [],
      }),
    find: (id, entry) =>
      Promise.resolve({
        kind: 'success',
        origin:
          originRows.find((found) => found.catalogId === id && found.entryId === entry) ?? null,
      }),
    findByBook: (id) => {
      if (fault === 'unavailable') return Promise.resolve(STORAGE_UNAVAILABLE);
      return Promise.resolve({
        kind: 'success',
        origin: originRows.find((found) => found.bookId === id) ?? null,
      });
    },
    deleteByBook: () => Promise.resolve({ kind: 'success' }),
    deleteByCatalog: (id) => {
      log.push(`clear ${id}`);
      for (let at = originRows.length - 1; at >= 0; at -= 1) {
        if (originRows[at]?.catalogId === id) originRows.splice(at, 1);
      }
      return Promise.resolve({ kind: 'success' });
    },
  };

  return { catalogs, origins, catalogRows, originRows, log };
}

const DRAFT = {
  title: ' Calibre ',
  protocol: 'opds1' as const,
  rootUrl: 'https://books.example/opds',
  auth: NONE,
};

describe('addCatalog', () => {
  it('saves the trimmed catalog under a minted id', async () => {
    const { catalogs, catalogRows } = fakes();

    const added = await addCatalog({ catalogs, newId: () => CALIBRE }, DRAFT);

    expect(added.kind === 'success' && added.catalog).toEqual({
      id: CALIBRE,
      title: 'Calibre',
      protocol: 'opds1' as const,
      rootUrl: 'https://books.example/opds',
      auth: NONE,
    });
    expect(catalogRows.size).toBe(1);
  });

  it('refuses an insecure root url and saves nothing', async () => {
    const { catalogs, catalogRows } = fakes();

    const added = await addCatalog(
      { catalogs, newId: () => CALIBRE },
      { ...DRAFT, rootUrl: 'http://books.example/opds' },
    );

    expect(added).toEqual({ kind: 'invalid-url', problem: 'insecure' });
    expect(catalogRows.size).toBe(0);
  });

  it('refuses a blank title', async () => {
    const { catalogs } = fakes();

    const added = await addCatalog({ catalogs, newId: () => CALIBRE }, { ...DRAFT, title: ' ' });

    expect(added).toEqual({ kind: 'empty-title' });
  });

  it('refuses basic auth without a username', async () => {
    const { catalogs } = fakes();

    const added = await addCatalog(
      { catalogs, newId: () => CALIBRE },
      { ...DRAFT, auth: { kind: 'basic', username: '' } },
    );

    expect(added).toEqual({ kind: 'missing-username' });
  });

  it('passes storage unavailable on', async () => {
    const { catalogs } = fakes('unavailable');

    expect(await addCatalog({ catalogs, newId: () => CALIBRE }, DRAFT)).toEqual(
      STORAGE_UNAVAILABLE,
    );
  });
});

describe('editCatalog', () => {
  it('replaces a held catalog with the checked draft', async () => {
    const { catalogs, catalogRows } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));

    const edited = await editCatalog({ catalogs }, CALIBRE, {
      ...DRAFT,
      title: 'Library',
      auth: { kind: 'basic', username: 'reader' },
    });

    expect(edited.kind === 'success' && edited.catalog).toEqual({
      id: CALIBRE,
      title: 'Library',
      protocol: 'opds1' as const,
      rootUrl: 'https://books.example/opds',
      auth: { kind: 'basic', username: 'reader' },
    });
    expect(catalogRows.get(CALIBRE)?.title).toBe('Library');
  });

  it('reports not-found for an id nothing holds', async () => {
    const { catalogs, catalogRows } = fakes();

    expect(await editCatalog({ catalogs }, CALIBRE, DRAFT)).toEqual({
      kind: 'not-found',
      id: CALIBRE,
    });
    expect(catalogRows.size).toBe(0);
  });

  it('refuses an invalid draft before reading', async () => {
    const { catalogs } = fakes();

    expect(await editCatalog({ catalogs }, CALIBRE, { ...DRAFT, rootUrl: 'nope' })).toEqual({
      kind: 'invalid-url',
      problem: 'unparseable',
    });
  });

  it('reports a damaged catalog as unreadable', async () => {
    const { catalogs } = fakes('unreadable');

    expect(await editCatalog({ catalogs }, CALIBRE, DRAFT)).toEqual({
      kind: 'unreadable',
      id: CALIBRE,
    });
  });

  it('passes storage unavailable on', async () => {
    const { catalogs } = fakes('unavailable');

    expect(await editCatalog({ catalogs }, CALIBRE, DRAFT)).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('removeCatalog', () => {
  it('clears the origins of the catalog, then the catalog, and keeps other origins', async () => {
    const { catalogs, origins, catalogRows, originRows, log } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));
    catalogRows.set(OTHER, catalog(OTHER));
    originRows.push(origin('book-1', CALIBRE, 'a'), origin('book-2', OTHER, 'a'));

    const removed = await removeCatalog(
      { catalogs, origins, passwords: fakePasswords(), remembered: fakeRememberedPasswords() },
      CALIBRE,
    );

    expect(removed).toEqual({ kind: 'success' });
    expect(log).toEqual(['clear calibre', 'remove calibre']);
    expect([...catalogRows.keys()]).toEqual([OTHER]);
    expect(originRows.map((found) => found.bookId)).toEqual(['book-2']);
  });

  it('reports not-found and deletes nothing for an id nothing holds', async () => {
    const { catalogs, origins, log } = fakes();

    expect(
      await removeCatalog(
        { catalogs, origins, passwords: fakePasswords(), remembered: fakeRememberedPasswords() },
        CALIBRE,
      ),
    ).toEqual({
      kind: 'not-found',
      id: CALIBRE,
    });
    expect(log).toEqual([]);
  });

  it('removes a damaged catalog so it can be cleared', async () => {
    const { catalogs, origins, log } = fakes('unreadable');

    expect(
      await removeCatalog(
        { catalogs, origins, passwords: fakePasswords(), remembered: fakeRememberedPasswords() },
        CALIBRE,
      ),
    ).toEqual({ kind: 'success' });
    expect(log).toEqual(['clear calibre', 'remove calibre']);
  });

  it('passes storage unavailable on', async () => {
    const { catalogs, origins } = fakes('unavailable');

    expect(
      await removeCatalog(
        { catalogs, origins, passwords: fakePasswords(), remembered: fakeRememberedPasswords() },
        CALIBRE,
      ),
    ).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('listCatalogs', () => {
  it('lists what the repository holds', async () => {
    const { catalogs, catalogRows } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));

    expect(await listCatalogs({ catalogs })).toEqual({
      kind: 'success',
      catalogs: [catalog(CALIBRE)],
      unreadable: [],
    });
  });

  it('passes storage unavailable on', async () => {
    const { catalogs } = fakes('unavailable');

    expect(await listCatalogs({ catalogs })).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('recordOrigin', () => {
  it('stores the origin', async () => {
    const { origins, originRows } = fakes();

    expect(await recordOrigin({ origins }, origin('book-1', CALIBRE, 'a'))).toEqual({
      kind: 'success',
    });
    expect(originRows).toHaveLength(1);
  });

  it('passes storage unavailable on', async () => {
    const { origins } = fakes('unavailable');

    expect(await recordOrigin({ origins }, origin('book-1', CALIBRE, 'a'))).toEqual(
      STORAGE_UNAVAILABLE,
    );
  });
});

describe('applyRemoteOrigin', () => {
  it('records an origin the device holds no origin for', async () => {
    const { origins, originRows } = fakes();
    const arrived = origin('book-1', CALIBRE, 'a');

    const applied = await applyRemoteOrigin({ origins }, arrived);

    expect(applied).toEqual({ kind: 'success', recorded: true });
    expect(originRows).toEqual([arrived]);
  });

  it('keeps the origin the device recorded when it downloaded the book itself', async () => {
    const { origins, originRows } = fakes();
    const mine = origin('book-1', CALIBRE, 'a');
    await recordOrigin({ origins }, mine);

    const applied = await applyRemoteOrigin({ origins }, origin('book-1', OTHER, 'b'));

    expect(applied).toEqual({ kind: 'success', recorded: false });
    expect(originRows).toEqual([mine]);
  });

  it('answers storage unavailable without writing', async () => {
    const { origins, originRows } = fakes('unavailable');

    const applied = await applyRemoteOrigin({ origins }, origin('book-1', CALIBRE, 'a'));

    expect(applied).toEqual(STORAGE_UNAVAILABLE);
    expect(originRows).toEqual([]);
  });
});

describe('listCatalogOrigins', () => {
  it('lists only the origins of the named catalog', async () => {
    const { origins, originRows } = fakes();
    originRows.push(origin('book-1', CALIBRE, 'a'), origin('book-2', OTHER, 'a'));

    const listed = await listCatalogOrigins({ origins }, OTHER);

    expect(listed.kind === 'success' && listed.origins.map((found) => found.bookId)).toEqual([
      'book-2',
    ]);
  });
});

describe('listOrigins', () => {
  it('lists the origins of every catalog', async () => {
    const { origins, originRows } = fakes();
    originRows.push(origin('book-1', CALIBRE, 'a'), origin('book-2', OTHER, 'a'));

    const listed = await listOrigins({ origins });

    expect(listed.kind === 'success' && listed.origins.map((found) => found.bookId)).toEqual([
      'book-1',
      'book-2',
    ]);
  });
});

describe('findOrigin', () => {
  it('finds the origin of an entry and answers null for an entry nothing downloaded', async () => {
    const { origins, originRows } = fakes();
    originRows.push(origin('book-1', CALIBRE, 'a'));

    const found = await findOrigin({ origins }, CALIBRE, 'a');
    const missing = await findOrigin({ origins }, CALIBRE, 'b');

    expect(found.kind === 'success' && found.origin?.bookId).toBe('book-1');
    expect(missing).toEqual({ kind: 'success', origin: null });
  });
});

describe('unlockCatalog', () => {
  it('holds the password for the session and removeCatalog forgets it', async () => {
    const { catalogs, origins, catalogRows } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));
    const passwords = fakePasswords();
    const remembered = fakeRememberedPasswords();

    expect(await unlockCatalog({ passwords, remembered }, CALIBRE, 'secret', false)).toEqual({
      kind: 'success',
    });
    expect(passwords.get(CALIBRE)).toBe('secret');

    await removeCatalog({ catalogs, origins, passwords, remembered }, CALIBRE);

    expect(passwords.get(CALIBRE)).toBeNull();
  });

  it('remembers the password on this device when asked to', async () => {
    const passwords = fakePasswords();
    const remembered = fakeRememberedPasswords();

    expect(await unlockCatalog({ passwords, remembered }, CALIBRE, 'secret', true)).toEqual({
      kind: 'success',
    });
    expect(remembered.held.get(CALIBRE)).toBe('secret');
  });

  it('drops an older remembered password when not asked to remember', async () => {
    const passwords = fakePasswords();
    const remembered = fakeRememberedPasswords();
    remembered.held.set(CALIBRE, 'old');

    expect(await unlockCatalog({ passwords, remembered }, CALIBRE, 'secret', false)).toEqual({
      kind: 'success',
    });
    expect(remembered.held.has(CALIBRE)).toBe(false);
    expect(passwords.get(CALIBRE)).toBe('secret');
  });

  it('keeps the session password and reports not-remembered when storage is unavailable', async () => {
    const passwords = fakePasswords();
    const remembered = fakeRememberedPasswords();
    remembered.unavailable = true;

    expect(await unlockCatalog({ passwords, remembered }, CALIBRE, 'secret', true)).toEqual({
      kind: 'not-remembered',
    });
    expect(passwords.get(CALIBRE)).toBe('secret');
  });

  it('answers success when forgetting an older password finds storage unavailable', async () => {
    const remembered = fakeRememberedPasswords();
    remembered.unavailable = true;

    expect(
      await unlockCatalog({ passwords: fakePasswords(), remembered }, CALIBRE, 'secret', false),
    ).toEqual({ kind: 'success' });
  });
});

describe('forgetCatalogPassword', () => {
  it('forgets the session and the remembered password', async () => {
    const passwords = fakePasswords();
    const remembered = fakeRememberedPasswords();
    passwords.set(CALIBRE, 'secret');
    remembered.held.set(CALIBRE, 'secret');

    expect(await forgetCatalogPassword({ passwords, remembered }, CALIBRE)).toEqual({
      kind: 'success',
    });
    expect(passwords.get(CALIBRE)).toBeNull();
    expect(remembered.held.has(CALIBRE)).toBe(false);
  });

  it('passes storage unavailable on', async () => {
    const remembered = fakeRememberedPasswords();
    remembered.unavailable = true;

    expect(
      await forgetCatalogPassword({ passwords: fakePasswords(), remembered }, CALIBRE),
    ).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('listRememberedPasswords', () => {
  it('lists the catalogs with a remembered password', async () => {
    const remembered = fakeRememberedPasswords();
    remembered.held.set(CALIBRE, 'secret');

    expect(await listRememberedPasswords({ remembered })).toEqual({
      kind: 'success',
      ids: new Set([CALIBRE]),
    });
  });
});

describe('removeCatalog remembered password', () => {
  it('forgets the remembered password with the catalog', async () => {
    const { catalogs, origins, catalogRows } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));
    const remembered = fakeRememberedPasswords();
    remembered.held.set(CALIBRE, 'secret');

    await removeCatalog({ catalogs, origins, passwords: fakePasswords(), remembered }, CALIBRE);

    expect(remembered.held.has(CALIBRE)).toBe(false);
  });

  it('passes storage unavailable on when the remembered password cannot be forgotten', async () => {
    const { catalogs, origins, catalogRows } = fakes();
    catalogRows.set(CALIBRE, catalog(CALIBRE));
    const remembered = fakeRememberedPasswords();
    remembered.unavailable = true;

    expect(
      await removeCatalog({ catalogs, origins, passwords: fakePasswords(), remembered }, CALIBRE),
    ).toEqual(STORAGE_UNAVAILABLE);
  });
});

describe('applyRemoteCatalogRemoval', () => {
  const ACCEPTED: AcceptedVersion = {
    kind: 'catalog',
    recordId: CALIBRE,
    version: { updatedAt: 1, deviceId: 'device' },
  };

  it('forgets the password after the removal applies', async () => {
    const { catalogs } = fakes();
    const forgotten: CatalogId[] = [];

    const applied = await applyRemoteCatalogRemoval(
      {
        catalogs,
        forgetPassword: (id) => {
          forgotten.push(id);
          return Promise.resolve({ kind: 'success' });
        },
      },
      CALIBRE,
      ACCEPTED,
    );

    expect(applied).toEqual({ kind: 'success' });
    expect(forgotten).toEqual([CALIBRE]);
  });

  it('forgets nothing when the removal does not apply', async () => {
    const { catalogs } = fakes();
    const forgotten: CatalogId[] = [];

    const applied = await applyRemoteCatalogRemoval(
      {
        catalogs: { ...catalogs, applyRemote: () => Promise.resolve(STORAGE_UNAVAILABLE) },
        forgetPassword: (id) => {
          forgotten.push(id);
          return Promise.resolve({ kind: 'success' });
        },
      },
      CALIBRE,
      ACCEPTED,
    );

    expect(applied).toEqual(STORAGE_UNAVAILABLE);
    expect(forgotten).toEqual([]);
  });
});
