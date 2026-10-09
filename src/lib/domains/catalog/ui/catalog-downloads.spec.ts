import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { DEFAULT_BOOK_MATCHING } from '$lib/domains/library/domain/book/book-matching';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { DownloadProgress } from '../domain/catalog-source';
import type { BookOriginLink } from '../domain/remote-item';
import type { RemotePublication } from '../domain/remote-publication';
import type { DownloadPublicationResult } from '../use-cases/download-publication';
import type { UpdatePublicationResult } from '../use-cases/update-publication';
import { CatalogDownloads } from './catalog-downloads.svelte';
import { publication } from './catalog-ui-fixtures';

type Pending = {
  readonly entryId: string;
  readonly report: DownloadProgress;
  readonly signal: AbortSignal | undefined;
  readonly finish: (result: DownloadPublicationResult) => void;
};

type PendingUpdate = {
  readonly entryId: string;
  readonly bookId: BookId;
  readonly finish: (result: UpdatePublicationResult) => void;
};

function setup() {
  let held: ReadonlyMap<string, BookOriginLink> = new Map();
  const pending: Pending[] = [];
  const updating: PendingUpdate[] = [];
  const updated: { entryId: string; bookId: BookId }[] = [];
  const calls: string[] = [];
  const downloaded: { entryId: string; bookId: BookId }[] = [];
  const downloads = new CatalogDownloads(
    {
      updatePublication: (item, heldBook) =>
        new Promise<UpdatePublicationResult>((resolve) => {
          updating.push({ entryId: item.entryId, bookId: heldBook, finish: resolve });
        }),
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
      updated: (item, id) => updated.push({ entryId: item.entryId, bookId: id }),
    },
    () => held,
  );
  const setHeld = (next: ReadonlyMap<string, BookOriginLink>): void => {
    held = next;
  };
  const next = (): Pending => {
    const first = pending.shift();
    if (first === undefined) throw new Error('no download is waiting');
    return first;
  };
  return { downloads, pending, calls, downloaded, updating, updated, next, setHeld };
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
    const { downloads, setHeld } = setup();
    setHeld(new Map([['a', { bookId: bookId('b'), updated: '2026-01-01T00:00:00Z' }]]));
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
    const { downloads, calls, next, setHeld } = setup();
    setHeld(new Map([['a', { bookId: bookId('x'), updated: '2026-08-01T00:00:00Z' }]]));
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

const STALE_LINK = { bookId: bookId('held-1'), updated: '2026-07-01T00:00:00Z' };

function setupStale() {
  const world = setup();
  world.setHeld(new Map([['a', STALE_LINK]]));
  return world;
}

describe('CatalogDownloads replacing a held book', () => {
  it('reports an entry newer than its origin as held-older', () => {
    const { downloads } = setupStale();
    expect(downloads.itemFor(publication('a')).kind).toBe('held-older');
  });

  it('reports an entry as held while its origin is as new', () => {
    const { downloads, setHeld } = setup();
    setHeld(new Map([['a', { bookId: bookId('held-1'), updated: '2026-08-01T00:00:00Z' }]]));
    expect(downloads.itemFor(publication('a')).kind).toBe('held');
  });

  it('asks once and updates nothing until the reader confirms', () => {
    const { downloads, updating } = setupStale();
    downloads.askToReplace(publication('a'), 4);
    expect(downloads.replacement).toEqual({
      publication: publication('a'),
      bookId: bookId('held-1'),
      feedPosition: 4,
    });
    expect(updating).toEqual([]);
    expect(downloads.itemFor(publication('a')).kind).toBe('held-older');
  });

  it('asks nothing for an entry that is not held or not newer', () => {
    const { downloads } = setup();
    downloads.askToReplace(publication('a'), 0);
    expect(downloads.replacement).toBeNull();
  });

  it('forgets the question when the reader declines', () => {
    const { downloads, updating } = setupStale();
    downloads.askToReplace(publication('a'), 0);
    downloads.dismissReplacement();
    expect(downloads.replacement).toBeNull();
    expect(updating).toEqual([]);
  });

  it('updates the held book on confirming, shows progress and then reports it held', async () => {
    const { downloads, updating, updated, calls } = setupStale();
    downloads.askToReplace(publication('a'), 0);

    const running = downloads.confirmReplacement();

    expect(downloads.replacement).toBeNull();
    expect(downloads.itemFor(publication('a')).kind).toBe('downloading');
    expect(updating.map((call) => [call.entryId, call.bookId])).toEqual([['a', 'held-1']]);
    updating[0]?.finish({ kind: 'success', bookId: bookId('held-1') });
    await running;

    expect(downloads.itemFor(publication('a'))).toMatchObject({ kind: 'held' });
    expect(updated).toEqual([{ entryId: 'a', bookId: bookId('held-1') }]);
    expect(calls).toEqual([]);
  });

  it('shows the failure and updates again, never downloads a second book, on a retry', async () => {
    const { downloads, updating, calls } = setupStale();
    downloads.askToReplace(publication('a'), 0);
    const first = downloads.confirmReplacement();
    updating[0]?.finish({ kind: 'already-held', bookId: bookId('other') });
    await first;

    expect(downloads.itemFor(publication('a'))).toMatchObject({
      kind: 'download-failed',
      reason: 'Another book on this device already has the newer file.',
    });

    void downloads.start(publication('a'), 0);
    expect(updating).toHaveLength(2);
    expect(calls).toEqual([]);
  });

  it('returns to held-older when the update is cancelled', async () => {
    const { downloads, updating } = setupStale();
    downloads.askToReplace(publication('a'), 0);
    const running = downloads.confirmReplacement();
    downloads.cancel('a');
    updating[0]?.finish({ kind: 'aborted' });
    await running;

    expect(downloads.itemFor(publication('a')).kind).toBe('held-older');
  });
});
