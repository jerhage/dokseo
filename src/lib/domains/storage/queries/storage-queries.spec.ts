import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { observedRead } from '$lib/shared/testing/observed-read';
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
  it('readies the account the use case reads', async () => {
    const client = createTestQueryClient();

    const read = await observedRead(
      client,
      storageAccountQuery({
        readStorageAccount: () => Promise.resolve({ kind: 'success', account: ACCOUNT }),
      }),
    );

    expect(read).toEqual(readReady(ACCOUNT));
  });

  it('fails with the cause of a survey that threw', async () => {
    const client = createTestQueryClient();
    const broken = new Error('denied');

    const read = await observedRead(
      client,
      storageAccountQuery({ readStorageAccount: () => Promise.reject(broken) }),
    );

    expect(read).toEqual(readFailed('Something went wrong: denied'));
  });

  it('files the account under the storage root key', () => {
    const { queryKey } = storageAccountQuery({ readStorageAccount: () => new Promise(() => {}) });

    expect(queryKey).toEqual(['storage', 'account']);
    expect(queryKey.slice(0, storageKeys.all().length)).toEqual(storageKeys.all());
  });
});
