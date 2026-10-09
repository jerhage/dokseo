import { describe, expect, it } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { BookOrigin } from '../domain/book-origin';
import { catalogListOf, listedCatalogs, listedOrigins } from './catalog-list';
import { ARCHIVE, HOME } from './catalog-ui-fixtures';

function origin(book: string, owner: BookOrigin['catalogId']): BookOrigin {
  return {
    bookId: bookId(book),
    catalogId: owner,
    entryId: book,
    acquisition: { href: 'https://x.test/1', format: 'epub', mediaType: 'x', length: null },
    updated: '2026-10-01T00:00:00Z',
    feedPath: [],
    feedPosition: 0,
    downloadedAt: 1,
  };
}

describe('catalogListOf', () => {
  it('lists the catalogs and the ids of unreadable rows', () => {
    const broken = catalogId('broken');

    expect(
      catalogListOf({
        kind: 'success',
        catalogs: [HOME],
        unreadable: [{ id: broken, stored: {} }],
      }),
    ).toEqual({ kind: 'ready', catalogs: [HOME], unreadable: [broken] });
  });

  it('reports unavailable storage', () => {
    expect(catalogListOf(STORAGE_UNAVAILABLE)).toEqual({ kind: 'storage-unavailable' });
  });
});

describe('listedCatalogs', () => {
  it('lists the catalogs of a read listing', () => {
    const listing = { kind: 'success', catalogs: [HOME, ARCHIVE], unreadable: [] } as const;

    expect(listedCatalogs(readReady(listing))).toEqual([HOME, ARCHIVE]);
  });

  it('lists none while reading, after a failed read, or for a blocked store', () => {
    expect(listedCatalogs(LOADING)).toEqual([]);
    expect(listedCatalogs(readFailed('denied'))).toEqual([]);
    expect(listedCatalogs(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
  });
});

describe('listedOrigins', () => {
  it('maps each downloaded book to the catalog it came from', () => {
    const listed = listedOrigins(
      readReady({
        catalogs: { kind: 'success', catalogs: [HOME], unreadable: [] },
        origins: {
          kind: 'success',
          origins: [origin('one', HOME.id), origin('two', ARCHIVE.id)],
          unreadable: [],
        },
      }),
    );

    expect(listed.catalogs).toEqual([HOME]);
    expect([...listed.owners]).toEqual([
      [bookId('one'), HOME.id],
      [bookId('two'), ARCHIVE.id],
    ]);
  });

  it('lists no origin for a blocked origin store and keeps the catalogs', () => {
    const listed = listedOrigins(
      readReady({
        catalogs: { kind: 'success', catalogs: [HOME], unreadable: [] },
        origins: STORAGE_UNAVAILABLE,
      }),
    );

    expect(listed.catalogs).toEqual([HOME]);
    expect(listed.owners.size).toBe(0);
  });

  it('lists nothing while reading or after a failed read', () => {
    expect(listedOrigins(LOADING)).toEqual({ catalogs: [], owners: new Map() });
    expect(listedOrigins(readFailed('denied'))).toEqual({ catalogs: [], owners: new Map() });
  });
});
