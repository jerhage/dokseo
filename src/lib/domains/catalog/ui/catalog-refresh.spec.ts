import { describe, expect, it } from 'vitest';
import { refreshCatalogRecords, refreshOrigins } from './catalog-refresh';

function recordingClient() {
  const invalidated: string[] = [];
  return {
    invalidated,
    client: {
      invalidateQueries: (filters?: { queryKey?: readonly unknown[] }) => {
        invalidated.push(filters?.queryKey?.join('/') ?? '');
        return Promise.resolve();
      },
    },
  };
}

describe('refreshOrigins', () => {
  it('invalidates the origins, which the held origins of a catalog sit under', async () => {
    const { invalidated, client } = recordingClient();

    await refreshOrigins(client);

    expect(invalidated).toEqual(['catalog/origins']);
  });
});

describe('refreshCatalogRecords', () => {
  it('invalidates the catalogs and the origins, since a sync can bring both', async () => {
    const { invalidated, client } = recordingClient();

    await refreshCatalogRecords(client);

    expect(invalidated).toEqual(['catalog/catalogs', 'catalog/origins']);
  });
});
