import { MutationObserver } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import { readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { observedRead } from '$lib/shared/testing/observed-read';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import type { Catalog } from '../domain/catalog';
import type { CatalogDraft } from '../domain/catalog-draft';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';
import { catalogKeys } from './catalog-keys';
import {
  addCatalogMutation,
  catalogsQuery,
  editCatalogMutation,
  originsQuery,
  removeCatalogMutation,
  testConnectionMutation,
} from './catalog-queries';

const BROKEN = new Error('denied');

const HOME: Catalog = {
  id: catalogId('home'),
  title: 'Home',
  protocol: 'opds1',
  rootUrl: 'https://home.example/opds',
  auth: { kind: 'none' },
};

const DRAFT: CatalogDraft = {
  title: 'Home',
  protocol: 'opds1',
  rootUrl: 'https://home.example/opds',
  auth: { kind: 'none' },
};

describe('catalogsQuery', () => {
  it('readies the listing unchanged, unreadable rows included', async () => {
    const client = createTestQueryClient();
    const listing: ListCatalogsResult = {
      kind: 'success',
      catalogs: [HOME],
      unreadable: [{ id: catalogId('broken'), stored: {} }],
    };

    const listed = await observedRead(
      client,
      catalogsQuery({ listCatalogs: () => Promise.resolve(listing) }),
    );

    expect(listed).toEqual(readReady(listing));
  });

  it('resolves a blocked store as an answer, so the screen can name it', async () => {
    const client = createTestQueryClient();
    const options = catalogsQuery({ listCatalogs: () => Promise.resolve(STORAGE_UNAVAILABLE) });

    const listed = await observedRead(client, options);

    expect(listed).toEqual(readReady(STORAGE_UNAVAILABLE));
    expect(client.getQueryState(options.queryKey)?.status).toBe('success');
  });

  it('fails with the cause of a listing that threw', async () => {
    const client = createTestQueryClient();

    const listed = await observedRead(
      client,
      catalogsQuery({ listCatalogs: () => Promise.reject(BROKEN) }),
    );

    expect(listed).toEqual(readFailed('Something went wrong: denied'));
  });
});

describe('originsQuery', () => {
  it('readies the listing unchanged', async () => {
    const client = createTestQueryClient();
    const listing: ListOriginsResult = { kind: 'success', origins: [], unreadable: [] };

    const listed = await observedRead(
      client,
      originsQuery({ listOrigins: () => Promise.resolve(listing) }),
    );

    expect(listed).toEqual(readReady(listing));
  });

  it('resolves a blocked store as an answer', async () => {
    const client = createTestQueryClient();

    const listed = await observedRead(
      client,
      originsQuery({ listOrigins: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    expect(listed).toEqual(readReady(STORAGE_UNAVAILABLE));
  });

  it('fails with the cause of a listing that threw', async () => {
    const client = createTestQueryClient();

    const listed = await observedRead(
      client,
      originsQuery({ listOrigins: () => Promise.reject(BROKEN) }),
    );

    expect(listed).toEqual(readFailed('Something went wrong: denied'));
  });
});

describe('catalogKeys', () => {
  it('files every catalog read under the catalog root key, each under its own key', () => {
    const keys = [
      catalogsQuery({ listCatalogs: () => new Promise(() => {}) }).queryKey,
      originsQuery({ listOrigins: () => new Promise(() => {}) }).queryKey,
    ];

    expect(keys.map((key) => key.slice(0, 1))).toEqual([catalogKeys.all(), catalogKeys.all()]);
    expect(new Set(keys.map((key) => key[1])).size).toBe(2);
  });

  it('names the keys a write invalidates', () => {
    expect(catalogKeys.catalogs()).toEqual(['catalog', 'catalogs']);
    expect(catalogKeys.origins()).toEqual(['catalog', 'origins']);
  });
});

describe('catalog mutations', () => {
  it('adds through the draft it is given and resolves the refusal as an answer', async () => {
    const client = createTestQueryClient();
    const refusal = { kind: 'empty-title' } as const;
    const asked: CatalogDraft[] = [];
    const adding = new MutationObserver(
      client,
      addCatalogMutation({
        addCatalog: (draft) => {
          asked.push(draft);
          return Promise.resolve(refusal);
        },
      }),
    );

    await expect(adding.mutate(DRAFT)).resolves.toBe(refusal);
    expect(asked).toEqual([DRAFT]);
  });

  it('edits the catalog the request names', async () => {
    const client = createTestQueryClient();
    const gone = { kind: 'not-found', id: HOME.id } as const;
    const asked: string[] = [];
    const editing = new MutationObserver(
      client,
      editCatalogMutation({
        editCatalog: (id) => {
          asked.push(id);
          return Promise.resolve(gone);
        },
      }),
    );

    await expect(editing.mutate({ id: HOME.id, draft: DRAFT })).resolves.toBe(gone);
    expect(asked).toEqual(['home']);
  });

  it('resolves a refused removal as an answer, not a rejection', async () => {
    const client = createTestQueryClient();
    const removal = new MutationObserver(
      client,
      removeCatalogMutation({ removeCatalog: () => Promise.resolve(STORAGE_UNAVAILABLE) }),
    );

    await expect(removal.mutate(HOME.id)).resolves.toBe(STORAGE_UNAVAILABLE);
  });

  it('rejects a removal that threw', async () => {
    const client = createTestQueryClient();
    const removal = new MutationObserver(
      client,
      removeCatalogMutation({ removeCatalog: () => Promise.reject(BROKEN) }),
    );

    await expect(removal.mutate(HOME.id)).rejects.toBe(BROKEN);
  });

  it('tests a connection with the draft and the typed password', async () => {
    const client = createTestQueryClient();
    const received: unknown[][] = [];
    const answer = { kind: 'success', feedTitle: 'Sample', feedKind: 'navigation' } as const;
    const testing = new MutationObserver(
      client,
      testConnectionMutation({
        testCatalogConnection: (...args) => {
          received.push(args);
          return Promise.resolve(answer);
        },
      }),
    );

    await expect(testing.mutate({ draft: DRAFT, password: 'secret' })).resolves.toBe(answer);
    expect(received).toEqual([[DRAFT, 'secret']]);
  });
});
