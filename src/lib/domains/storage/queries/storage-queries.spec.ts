import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { accountOf } from '../domain/storage-parts';
import { storageKeys } from './storage-keys';
import { storageAccountQuery } from './storage-queries';

const ACCOUNT = accountOf(
  [{ key: 'model', label: 'manga-ocr base', detail: '7 files', bytes: 205_000_000 }],
  { usage: 395_000_000, quota: 11_133_000_000 },
  true,
);

describe('storageAccountQuery', () => {
  it('resolves the account the use case reads', async () => {
    const client = createTestQueryClient();

    const read = await client.fetchQuery(
      storageAccountQuery({
        readStorageAccount: () => Promise.resolve({ kind: 'success', account: ACCOUNT }),
      }),
    );

    expect(read).toBe(ACCOUNT);
  });

  it('rejects with the error a failed survey throws', async () => {
    const client = createTestQueryClient();
    const broken = new Error('denied');

    const fetched = client.fetchQuery(
      storageAccountQuery({ readStorageAccount: () => Promise.reject(broken) }),
    );

    await expect(fetched).rejects.toBe(broken);
  });

  it('files the account under the storage root key', () => {
    const { queryKey } = storageAccountQuery({ readStorageAccount: () => new Promise(() => {}) });

    expect(queryKey).toEqual(['storage', 'account']);
    expect(queryKey.slice(0, storageKeys.all().length)).toEqual(storageKeys.all());
  });
});
