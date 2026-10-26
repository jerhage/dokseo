import { describe, expect, it } from 'vitest';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import { catalogId } from '$lib/shared/ids';
import { fromSyncCatalogData, toSyncCatalogData } from './catalog-data';
import { contractExamples, schemaKeys } from './contract-examples';

const ID = catalogId('00000000-0000-4000-8000-000000000009');

const BASIC: Catalog = {
  id: ID,
  title: 'Home library',
  protocol: 'opds1',
  rootUrl: 'https://books.example.net/opds',
  auth: { kind: 'basic', username: 'reader' },
};

const OPEN: Catalog = { ...BASIC, auth: { kind: 'none' } };

describe('catalog record data', () => {
  it('reads every valid contract example as a catalog', () => {
    for (const { name, value } of contractExamples('valid', 'catalog')) {
      expect(fromSyncCatalogData(value, ID).kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'catalog')) {
      expect(fromSyncCatalogData(value, ID).kind, name).toBe('unreadable');
    }
  });

  it('writes the schema fields and reads each catalog back unchanged', () => {
    const keys = schemaKeys('catalog');
    for (const catalog of [BASIC, OPEN]) {
      const data = toSyncCatalogData(catalog);
      expect(Object.keys(data).toSorted()).toEqual(keys.required.toSorted());
      expect(fromSyncCatalogData(data, ID)).toEqual({ kind: 'success', catalog });
    }
  });

  it('writes no password even when the record holds one', () => {
    const holding = { ...BASIC, password: 'hunter2', auth: { ...BASIC.auth, password: 'hunter2' } };
    expect(JSON.stringify(toSyncCatalogData(holding))).not.toContain('hunter2');
  });

  it('keeps the password out of the reason it gives for refusing one', () => {
    const read = fromSyncCatalogData({ ...toSyncCatalogData(BASIC), password: 'hunter2' }, ID);
    expect(read.kind).toBe('unreadable');
    expect(JSON.stringify(read)).not.toContain('hunter2');
  });
});
