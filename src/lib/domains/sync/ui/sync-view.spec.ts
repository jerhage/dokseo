import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { syncView } from './sync-view';

describe('syncView', () => {
  it('names the connection when connected', () => {
    const connected = {
      kind: 'connected',
      serverUrl: 'https://sync.example/',
      deviceName: 'Chrome on Mac',
      lastSyncAt: null,
      autoDownload: false,
    } as const;

    expect(syncView(readReady(connected))).toEqual({ kind: 'connected', connection: connected });
  });

  it('passes each other state through by name', () => {
    expect([
      syncView({ kind: 'loading' }).kind,
      syncView(readFailed('broken')),
      syncView(readReady({ kind: 'not-connected' })).kind,
      syncView(readReady(STORAGE_UNAVAILABLE)).kind,
    ]).toEqual([
      'loading',
      { kind: 'failed', message: 'broken' },
      'not-connected',
      'storage-unavailable',
    ]);
  });
});
