import { describe, expect, it } from 'vitest';
import { QueryFailure } from '$lib/shared/query-failure';
import { err, ok } from '$lib/shared/result';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { accountOf } from '../domain/storage-parts';
import { storageKeys } from './storage-keys';
import { failureNote, storageAccountQuery } from './storage-queries';

const ACCOUNT = accountOf(
  [{ key: 'model', label: 'manga-ocr base', detail: '7 files', bytes: 205_000_000 }],
  { usage: 395_000_000, quota: 11_133_000_000 },
  true,
);

describe('storageAccountQuery', () => {
  it('resolves the account the use case reads', async () => {
    const client = createTestQueryClient();

    const read = await client.fetchQuery(
      storageAccountQuery({ readStorageAccount: () => Promise.resolve(ok(ACCOUNT)) }),
    );

    expect(read).toBe(ACCOUNT);
  });

  it('rejects a failed survey with the described message', async () => {
    const client = createTestQueryClient();

    const fetched = client.fetchQuery(
      storageAccountQuery({
        readStorageAccount: () =>
          Promise.resolve(err({ kind: 'survey-failed' as const, cause: 'denied' })),
      }),
    );

    await expect(fetched).rejects.toBeInstanceOf(QueryFailure);
    await expect(fetched).rejects.toThrow('What this app stores could not be read: denied');
  });

  it('files the account under the storage root key', () => {
    const { queryKey } = storageAccountQuery({ readStorageAccount: () => new Promise(() => {}) });

    expect(queryKey).toEqual(['storage', 'account']);
    expect(queryKey.slice(0, storageKeys.all().length)).toEqual(storageKeys.all());
  });
});

describe('failureNote', () => {
  it('names the cause of a failed survey', () => {
    expect(failureNote({ kind: 'survey-failed', cause: 'denied' })).toBe(
      'What this app stores could not be read: denied',
    );
  });
});
