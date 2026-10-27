import { describe, expect, it } from 'vitest';
import { readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { catalogId } from '$lib/shared/ids';
import type { RemoteBook } from '../use-cases/list-remote-books';
import { remoteBookRow, remoteBooksView, remoteListOf } from './remote-books';

const ORIGIN = {
  catalogId: catalogId('00000000-0000-4000-8000-000000000009'),
  entryId: 'urn:uuid:5d1c',
  acquisition: { href: '/get/5d1c.cbz', format: 'cbz', mediaType: 'application/zip', length: null },
  updated: '2026-03-02T10:00:00Z',
  feedPath: [],
  feedPosition: 3,
  downloadedAt: 1,
} as const;

const DOWNLOADABLE: RemoteBook = {
  contentHash: 'a',
  title: 'Yotsuba&!',
  alias: 'Yotsuba',
  language: 'ja',
  fileDiffers: false,
  availability: { kind: 'downloadable', origin: ORIGIN },
};

const ABSENT: RemoteBook = {
  ...DOWNLOADABLE,
  alias: null,
  availability: { kind: 'not-on-this-device' },
};

describe('remoteBookRow', () => {
  it('offers a download for a book with a catalog and shows the progress and the failure', () => {
    expect(remoteBookRow(DOWNLOADABLE, { kind: 'idle' })).toEqual({
      title: 'Yotsuba',
      status: 'Not downloaded',
      downloadable: true,
      action: 'Download',
    });
    expect(remoteBookRow(DOWNLOADABLE, { kind: 'running', progress: 0.256 }).status).toBe(
      'Downloading 26%',
    );
    expect(
      remoteBookRow(DOWNLOADABLE, { kind: 'failed', reason: 'You are offline.' }),
    ).toMatchObject({
      status: 'You are offline.',
      action: 'Try again',
    });
  });

  it('says the catalog file differs while keeping the download offered, until a download is running or has failed', () => {
    const differs = { ...DOWNLOADABLE, fileDiffers: true };

    expect(remoteBookRow(differs, { kind: 'idle' })).toEqual({
      title: 'Yotsuba',
      status: "The catalog's file is not the one on your other device.",
      downloadable: true,
      action: 'Download',
    });
    expect(remoteBookRow(differs, { kind: 'running', progress: null }).status).toBe('Downloading…');
  });

  it('offers no download for a book that is not on this device and says how to get it', () => {
    expect(remoteBookRow(ABSENT, { kind: 'idle' })).toEqual({
      title: 'Yotsuba&!',
      status: 'Not on this device. Add the file to read it here.',
      downloadable: false,
      action: '',
    });
  });
});

describe('remoteBooksView', () => {
  it('lists the books and hides the section for an empty list, a failure or a loading read', () => {
    expect(remoteBooksView(readReady({ kind: 'success', books: [ABSENT] })).kind).toBe('listed');
    expect([
      remoteBooksView(readReady({ kind: 'success', books: [] })).kind,
      remoteBooksView(readReady({ kind: 'not-connected' })).kind,
      remoteBooksView(readReady(STORAGE_UNAVAILABLE)).kind,
      remoteBooksView(readFailed('broken')).kind,
      remoteBooksView({ kind: 'loading' }).kind,
    ]).toEqual(['hidden', 'hidden', 'hidden', 'hidden', 'hidden']);
  });
});

describe('remoteListOf', () => {
  it('reports nothing known while the list is loading', () => {
    expect(remoteListOf({ kind: 'loading' })).toBeNull();
  });

  it('lists the remote books of a successful read', () => {
    expect(remoteListOf(readReady({ kind: 'success', books: [ABSENT] }))).toEqual([ABSENT]);
  });

  it('lists none when sync is not connected, failed or storage is unavailable', () => {
    expect(remoteListOf(readReady({ kind: 'not-connected' }))).toEqual([]);
    expect(remoteListOf(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
    expect(remoteListOf(readFailed('gone'))).toEqual([]);
  });
});
