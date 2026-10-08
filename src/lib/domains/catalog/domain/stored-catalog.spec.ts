import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import type { Catalog } from './catalog';
import { catalogFromStored, catalogsFromStored, storedCatalogRow } from './stored-catalog';

const CATALOG: Catalog = {
  id: catalogId('calibre'),
  title: 'Calibre',
  rootUrl: 'https://books.example/opds',
  auth: { kind: 'basic', username: 'reader' },
};

const ROW = storedCatalogRow(CATALOG);

describe('catalogFromStored', () => {
  it('reads back the row it wrote', () => {
    expect(catalogFromStored(ROW)).toEqual(CATALOG);
    expect(catalogFromStored(storedCatalogRow({ ...CATALOG, auth: { kind: 'none' } }))).toEqual({
      ...CATALOG,
      auth: { kind: 'none' },
    });
  });

  it('drops a password a wider auth value carries', () => {
    const wider = {
      kind: 'basic',
      username: 'reader',
      password: 'hunter2',
    } as const;

    expect(storedCatalogRow({ ...CATALOG, auth: wider }).auth).toEqual({
      kind: 'basic',
      username: 'reader',
    });
  });

  it.each([
    ['a missing title', { ...ROW, title: undefined }],
    ['an empty root url', { ...ROW, rootUrl: '' }],
    ['an id that is not a flat key', { ...ROW, id: 'a/b' }],
    ['an unknown auth kind', { ...ROW, auth: { kind: 'bearer' } }],
    ['basic auth without a username', { ...ROW, auth: { kind: 'basic' } }],
    ['auth that is not an object', { ...ROW, auth: 'none' }],
  ])('rejects %s', (_name, row) => {
    expect(() => catalogFromStored(row)).toThrow();
  });
});

describe('catalogsFromStored', () => {
  it('separates readable catalogs from damaged rows that still have an id', () => {
    const damaged = { ...ROW, id: 'broken', auth: 'none' };

    const { catalogs, unreadable } = catalogsFromStored([ROW, damaged]);

    expect(catalogs).toEqual([CATALOG]);
    expect(unreadable).toEqual([{ id: 'broken', stored: damaged }]);
  });

  it('throws on a damaged row that has no id to report', () => {
    expect(() => catalogsFromStored([{ title: 'Nameless' }])).toThrow();
  });
});
