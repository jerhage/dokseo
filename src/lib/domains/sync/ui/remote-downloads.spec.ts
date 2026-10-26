import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import type { DownloadRemoteBookResult } from '../use-cases/download-remote-book';
import { downloadOutcome } from './remote-downloads';
import { createRemoteDownloads } from './remote-downloads.svelte';

const CATALOG = catalogId('00000000-0000-4000-8000-000000000009');

describe('downloadOutcome', () => {
  it('asks for the password, as refused when the catalog rejected the one entered', () => {
    expect(downloadOutcome({ kind: 'locked', catalogId: CATALOG })).toEqual({
      kind: 'ask-password',
      catalogId: CATALOG,
      refused: false,
    });
    expect(downloadOutcome({ kind: 'unauthorized', catalogId: CATALOG })).toMatchObject({
      kind: 'ask-password',
      refused: true,
    });
  });
});

describe('createRemoteDownloads', () => {
  it('remembers which book and catalog need a password and shows a failure on the book', async () => {
    const downloads = createRemoteDownloads();
    const locked: DownloadRemoteBookResult = { kind: 'locked', catalogId: CATALOG };

    await downloads.start('a', async () => locked);
    await downloads.start('b', async () => ({ kind: 'offline' }));

    expect(downloads.ask).toEqual({
      kind: 'asking',
      contentHash: 'a',
      catalogId: CATALOG,
      refused: false,
    });
    expect(downloads.stateOf('a')).toEqual({ kind: 'idle' });
    expect(downloads.stateOf('b').kind).toBe('failed');
  });
});
