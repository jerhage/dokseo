import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { DownloadProgress } from '../domain/opds-client';
import type { RemotePublication } from '../domain/remote-publication';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { publication } from './catalog-ui-fixtures';

type Pending = {
  readonly entryId: string;
  readonly report: DownloadProgress;
  readonly signal: AbortSignal | undefined;
  readonly finish: (result: DownloadPublicationResult) => void;
};

function setup() {
  const pending: Pending[] = [];
  const calls: string[] = [];
  const downloaded: { entryId: string; bookId: BookId }[] = [];
  const downloads = new CatalogDownloads(
    {
      downloadPublication: (item, _position, _matching, _defaults, report, signal) => {
        calls.push(item.entryId);
        return new Promise<DownloadPublicationResult>((resolve) => {
          pending.push({ entryId: item.entryId, report, signal, finish: resolve });
          signal?.addEventListener('abort', () => resolve({ kind: 'aborted' }));
        });
      },
    },
    { matching: () => DEFAULT_BOOK_MATCHING, defaults: () => INITIAL_READING_DEFAULTS },
    {
      describeOpenFile: () => 'could not open',
      downloaded: (item, id) => downloaded.push({ entryId: item.entryId, bookId: id }),
    },
  );
  const next = (): Pending => {
    const first = pending.shift();
    if (first === undefined) throw new Error('no download is waiting');
    return first;
  };
  return { downloads, pending, calls, downloaded, next };
}

function queued(...ids: string[]) {
  return ids.map((id, index) => ({ publication: publication(id), feedPosition: index }));
}

function stateOf(downloads: CatalogDownloads, item: RemotePublication) {
  return downloads.itemFor(item).kind;
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('CatalogDownloads', () => {
  it('reports a downloadable entry as remote before anything starts', () => {
    const { downloads } = setup();
    expect(stateOf(downloads, publication('a'))).toBe('remote');
  });

  it('shows an unknown fraction while the first byte is awaited', () => {
    const { downloads } = setup();
    void downloads.start(publication('a'), 0);
    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'downloading',
      progress: null,
    });
  });

  it('follows the reported fraction', () => {
    const { downloads, next } = setup();
    void downloads.start(publication('a'), 0);
    next().report(0.4);
    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'downloading',
      progress: 0.4,
    });
  });

  it('holds the entry once the download succeeds and announces it', async () => {
    const { downloads, next, downloaded } = setup();
    const running = downloads.start(publication('a'), 0);
    next().finish({ kind: 'success', bookId: bookId('book-a') });
    await running;
    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'held',
      bookId: bookId('book-a'),
    });
    expect(downloaded).toEqual([{ entryId: 'a', bookId: bookId('book-a') }]);
  });

  it('reports the reason when the download fails, and retries from there', async () => {
    const { downloads, next } = setup();
    const running = downloads.start(publication('a'), 0);
    next().finish({ kind: 'offline' });
    await running;
    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'download-failed',
      reason: 'You are offline. Connect to the network and try again.',
    });
    void downloads.start(publication('a'), 0);
    expect(stateOf(downloads, publication('a'))).toBe('downloading');
  });

  it('describes a failure to add the file through the library text', async () => {
    const { downloads, next } = setup();
    const running = downloads.start(publication('a'), 0);
    next().finish({ kind: 'fingerprint', cause: 'x' });
    await running;
    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'download-failed',
      reason: 'could not open',
    });
  });

  it('returns to remote when the reader cancels', async () => {
    const { downloads, next } = setup();
    const running = downloads.start(publication('a'), 0);
    const waiting = next();
    downloads.cancel('a');
    await running;
    expect(waiting.signal?.aborted).toBe(true);
    expect(stateOf(downloads, publication('a'))).toBe('remote');
  });

  it('starts an entry once while it is running', () => {
    const { downloads, calls } = setup();
    void downloads.start(publication('a'), 0);
    void downloads.start(publication('a'), 0);
    expect(calls).toEqual(['a']);
  });

  it('keeps the entry held-older when the server has a later update', () => {
    const { downloads } = setup();
    downloads.setHeld(new Map([['a', { bookId: bookId('b'), updated: '2026-01-01T00:00:00Z' }]]));
    expect(stateOf(downloads, publication('a'))).toBe('held-older');
  });
});

describe('CatalogDownloads queue', () => {
  it('downloads the remote entries one at a time, in feed order', async () => {
    const { downloads, calls, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b', 'c'));
    expect(calls).toEqual(['a']);
    next().finish({ kind: 'success', bookId: bookId('1') });
    await settle();
    expect(calls).toEqual(['a', 'b']);
    next().finish({ kind: 'success', bookId: bookId('2') });
    await settle();
    expect(calls).toEqual(['a', 'b', 'c']);
    next().finish({ kind: 'success', bookId: bookId('3') });
    await all;
    expect(downloads.queue).toBeNull();
  });

  it('counts the place in the queue', async () => {
    const { downloads, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b'));
    expect(downloads.queue).toEqual({ position: 1, total: 2 });
    next().finish({ kind: 'success', bookId: bookId('1') });
    await settle();
    expect(downloads.queue).toEqual({ position: 2, total: 2 });
    next().finish({ kind: 'success', bookId: bookId('2') });
    await all;
  });

  it('leaves out entries that are held or unsupported', async () => {
    const { downloads, calls, next } = setup();
    downloads.setHeld(new Map([['a', { bookId: bookId('x'), updated: '2026-08-01T00:00:00Z' }]]));
    const entries = [
      ...queued('a', 'b'),
      { publication: publication('c', { acquisition: null }), feedPosition: 2 },
    ];
    const all = downloads.downloadAll(entries);
    next().finish({ kind: 'success', bookId: bookId('1') });
    await all;
    expect(calls).toEqual(['b']);
  });

  it('stops the rest and aborts the running one on cancel all', async () => {
    const { downloads, calls, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b', 'c'));
    const waiting = next();
    downloads.cancelAll();
    await all;
    expect(waiting.signal?.aborted).toBe(true);
    expect(calls).toEqual(['a']);
    expect(downloads.queue).toBeNull();
    expect(stateOf(downloads, publication('b'))).toBe('remote');
  });

  it('goes on to the next entry after a failure of one file', async () => {
    const { downloads, calls, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b'));
    next().finish({ kind: 'not-found' });
    await settle();
    next().finish({ kind: 'success', bookId: bookId('2') });
    await all;
    expect(calls).toEqual(['a', 'b']);
    expect(stateOf(downloads, publication('a'))).toBe('download-failed');
  });

  it('stops at once when the connection is gone', async () => {
    const { downloads, calls, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b'));
    next().finish({ kind: 'offline' });
    await all;
    expect(calls).toEqual(['a']);
  });

  it('skips an entry the reader downloaded by hand while it waited', async () => {
    const { downloads, calls, next } = setup();
    const all = downloads.downloadAll(queued('a', 'b'));
    void downloads.start(publication('b'), 1);
    next().finish({ kind: 'success', bookId: bookId('1') });
    await settle();
    expect(calls).toEqual(['a', 'b']);
    next().finish({ kind: 'success', bookId: bookId('2') });
    await all;
    expect(calls).toEqual(['a', 'b']);
  });

  it('refuses a second queue while one runs', async () => {
    const { downloads, calls, next } = setup();
    const first = downloads.downloadAll(queued('a'));
    await downloads.downloadAll(queued('b'));
    expect(calls).toEqual(['a']);
    next().finish({ kind: 'success', bookId: bookId('1') });
    await first;
  });
});
