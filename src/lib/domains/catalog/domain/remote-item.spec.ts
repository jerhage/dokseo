import { describe, expect, it } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import { remoteItem } from './remote-item';
import type { BookOriginLink, DownloadState } from './remote-item';
import type { RemotePublication } from './remote-publication';

const IDLE: DownloadState = { kind: 'idle' };

function publication(overrides: Partial<RemotePublication> = {}): RemotePublication {
  return {
    catalogId: catalogId('c1'),
    entryId: 'e1',
    title: 'Star Voyage',
    authors: [],
    language: null,
    summary: '',
    updated: '2026-08-01T00:00:00Z',
    cover: null,
    acquisition: {
      href: 'https://example.org/get/1',
      format: 'epub',
      mediaType: 'application/epub+zip',
      length: null,
    },
    feedPath: [],
    ...overrides,
  };
}

function origin(updated: string): BookOriginLink {
  return { bookId: bookId('b1'), updated };
}

describe('remoteItem', () => {
  it('reports a downloadable publication nobody holds as remote', () => {
    expect(remoteItem(publication(), null, IDLE).kind).toBe('remote');
  });

  it('reports a publication without an acquisition as unsupported', () => {
    expect(remoteItem(publication({ acquisition: null }), null, IDLE).kind).toBe('unsupported');
  });

  it('reports a running download with its progress', () => {
    const item = remoteItem(publication(), null, { kind: 'running', progress: 0.4 });

    expect(item).toMatchObject({ kind: 'downloading', progress: 0.4 });
  });

  it('reports a failed download with its reason', () => {
    const item = remoteItem(publication(), null, { kind: 'failed', reason: 'offline' });

    expect(item).toMatchObject({ kind: 'download-failed', reason: 'offline' });
  });

  it('puts a running download ahead of a held book', () => {
    const item = remoteItem(publication(), origin('2026-08-01T00:00:00Z'), {
      kind: 'running',
      progress: 0,
    });

    expect(item.kind).toBe('downloading');
  });

  it('reports a book held at the same update as held', () => {
    const item = remoteItem(publication(), origin('2026-08-01T00:00:00Z'), IDLE);

    expect(item).toMatchObject({ kind: 'held', bookId: bookId('b1') });
  });

  it('reports a book held at a later update as held', () => {
    expect(remoteItem(publication(), origin('2026-09-01T00:00:00Z'), IDLE).kind).toBe('held');
  });

  it('reports a book held at an earlier update as held-older', () => {
    const item = remoteItem(publication(), origin('2026-07-01T00:00:00Z'), IDLE);

    expect(item).toMatchObject({ kind: 'held-older', bookId: bookId('b1') });
  });

  it('reports a held book without an acquisition as held', () => {
    const item = remoteItem(
      publication({ acquisition: null }),
      origin('2026-08-01T00:00:00Z'),
      IDLE,
    );

    expect(item.kind).toBe('held');
  });

  it.each([
    ['the publication date', publication({ updated: 'someday' }), '2026-07-01T00:00:00Z'],
    ['the origin date', publication(), 'someday'],
  ])('never counts an unparsable %s as newer', (_name, subject, originUpdated) => {
    expect(remoteItem(subject, origin(originUpdated), IDLE).kind).toBe('held');
  });
});
