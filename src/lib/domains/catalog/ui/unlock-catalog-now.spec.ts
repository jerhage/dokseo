import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import { unlockCatalogNow } from './unlock-catalog-now';

describe('unlockCatalogNow', () => {
  it('unlocks at once and invalidates the remembered passwords once it settles', async () => {
    const calls: string[] = [];
    const id: CatalogId = catalogId('home');
    const cases = {
      unlockCatalog: (target: CatalogId, password: string, remember: boolean) => {
        calls.push(`unlock ${target} ${password} ${remember}`);
        return Promise.resolve({ kind: 'not-remembered' as const });
      },
    };
    const client = {
      invalidateQueries: (filters?: { queryKey?: readonly unknown[] }) => {
        calls.push(`invalidate ${filters?.queryKey?.join('/')}`);
        return Promise.resolve();
      },
    };

    const pending = unlockCatalogNow(cases, client, id, 'secret', true);
    expect(calls).toEqual(['unlock home secret true']);

    await expect(pending).resolves.toEqual({ kind: 'not-remembered' });
    expect(calls).toEqual(['unlock home secret true', 'invalidate catalog/remembered-passwords']);
  });
});
