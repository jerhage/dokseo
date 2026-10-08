import { describe, expect, it } from 'vitest';
import { CATALOG_PROTOCOLS } from '../domains/catalog/domain/catalog-protocol';
import { catalogSourceFor, sources } from './catalog-sources';

describe('catalogSourceFor', () => {
  it('resolves a source for opds1 that answers every port method', async () => {
    const source = await catalogSourceFor('opds1');

    expect(typeof source.readFeed).toBe('function');
    expect(typeof source.search).toBe('function');
    expect(typeof source.readImage).toBe('function');
    expect(typeof source.download).toBe('function');
  });

  it.each(CATALOG_PROTOCOLS)('resolves a source for the protocol %s', async (protocol) => {
    await expect(catalogSourceFor(protocol)).resolves.toBeDefined();
  });

  it('loads the adapter once and hands the same source to every caller', async () => {
    const first = catalogSourceFor('opds1');
    const second = catalogSourceFor('opds1');

    expect(second).toBe(first);
    expect(await second).toBe(await first);
    expect(sources.size).toBe(1);
  });
});
