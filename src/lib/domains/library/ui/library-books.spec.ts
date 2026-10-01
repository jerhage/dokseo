import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Book } from '../domain/book/book';
import type { LibraryError } from '../domain/book/library-repository';
import { LibraryBooks } from './library-books.svelte';

type Deferred<T> = { readonly promise: Promise<T>; readonly settle: (value: T) => void };

type World = {
  readonly container: Container;
  readonly lists: Deferred<Result<readonly Book[], LibraryError>>[];
  readonly cover: { outcome: Result<Blob, LibraryError>; gate: () => Promise<void> };
  readonly size: { outcome: Result<number, LibraryError> };
};

function deferred<T>(): Deferred<T> {
  let settle: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

function book(id: string, overrides: Partial<Book> = {}): Book {
  return {
    id: bookId(id),
    title: id,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(13)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function world(): World {
  const lists: Deferred<Result<readonly Book[], LibraryError>>[] = [];
  const cover: World['cover'] = {
    outcome: ok(new Blob(['cover'])),
    gate: () => Promise.resolve(),
  };
  const size: World['size'] = { outcome: ok(2048) };
  const library: Partial<Container['library']> = {
    listBooks: () => {
      const next = deferred<Result<readonly Book[], LibraryError>>();
      lists.push(next);
      return next.promise;
    },
    readCover: () => cover.gate().then(() => cover.outcome),
    readLibrarySize: () => Promise.resolve(size.outcome),
  };
  return { container: { library } as unknown as Container, lists, cover, size };
}

async function settleMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

async function loaded(books: readonly Book[], fakes = world()): Promise<LibraryBooks> {
  const library = new LibraryBooks(fakes.container);
  const running = library.load();
  at(fakes.lists, fakes.lists.length - 1).settle(ok(books));
  await running;
  return library;
}

let created: string[] = [];
let revoked: string[] = [];
let originalCreate: typeof URL.createObjectURL | undefined;
let originalRevoke: typeof URL.revokeObjectURL | undefined;

beforeEach(() => {
  created = [];
  revoked = [];
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => {
    const url = `blob:cover-${created.length + 1}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
});

afterEach(() => {
  URL.createObjectURL = originalCreate as typeof URL.createObjectURL;
  URL.revokeObjectURL = originalRevoke as typeof URL.revokeObjectURL;
});

describe('LibraryBooks', () => {
  it('moves from loading to ready and exposes the books with their covers', async () => {
    const fakes = world();
    const library = new LibraryBooks(fakes.container);
    expect(library.state).toEqual({ kind: 'loading' });

    const running = library.load();
    expect(library.state.kind).toBe('loading');

    at(fakes.lists, 0).settle(ok([book('one'), book('two')]));
    await running;

    expect(library.state.kind).toBe('ready');
    expect(library.books.map((b) => b.id)).toEqual(['one', 'two']);
    expect(library.covers.size).toBe(2);
  });

  it('exposes the bytes the uploads occupy once the library has loaded', async () => {
    const fakes = world();
    expect(new LibraryBooks(fakes.container).storedBytes).toBeNull();

    const library = await loaded([book('one')], fakes);

    expect(library.storedBytes).toBe(2048);
  });

  it('reports no size when the uploads cannot be measured', async () => {
    const fakes = world();
    fakes.size.outcome = err({ kind: 'storage-unavailable' });

    const library = await loaded([book('one')], fakes);

    expect(library.state.kind).toBe('ready');
    expect(library.storedBytes).toBeNull();
  });

  it('orders the newest upload first', async () => {
    const library = await loaded([book('older', { addedAt: 1 }), book('newer', { addedAt: 2 })]);

    expect(library.books.map((b) => b.id)).toEqual(['newer', 'older']);
  });

  it('lands a repository failure in the failed state without throwing', async () => {
    const fakes = world();
    const library = new LibraryBooks(fakes.container);

    const running = library.load();
    at(fakes.lists, 0).settle(err({ kind: 'storage-failed', cause: 'quota exceeded' }));
    await expect(running).resolves.toBeUndefined();

    expect(library.state).toEqual({
      kind: 'failed',
      message: 'Local storage failed: quota exceeded',
    });
    expect(library.failure).toBe('Local storage failed: quota exceeded');
    expect(library.books).toEqual([]);
  });

  it('keeps the books on show while a reload runs', async () => {
    const fakes = world();
    const library = await loaded([book('one')], fakes);

    const reloading = library.load();

    expect(library.state).toMatchObject({ kind: 'ready', refresh: { kind: 'refreshing' } });
    expect(library.books.map((b) => b.id)).toEqual(['one']);
    expect(library.storedBytes).toBe(2048);

    at(fakes.lists, 1).settle(ok([book('one'), book('two', { addedAt: 0 })]));
    await reloading;

    expect(library.state).toMatchObject({ kind: 'ready', refresh: { kind: 'settled' } });
    expect(library.books.map((b) => b.id)).toEqual(['one', 'two']);
  });

  it('keeps the books it holds and reports the failure when a reload fails', async () => {
    const fakes = world();
    const library = await loaded([book('one')], fakes);

    const reloading = library.load();
    at(fakes.lists, 1).settle(err({ kind: 'storage-failed', cause: 'gone' }));
    await reloading;

    expect(library.state).toMatchObject({
      kind: 'ready',
      refresh: { kind: 'failed', message: 'Local storage failed: gone' },
    });
    expect(library.failure).toBe('Local storage failed: gone');
    expect(library.books.map((b) => b.id)).toEqual(['one']);
    expect(library.covers.size).toBe(1);
  });

  it('loads afresh after a failed first read, then clears the failure', async () => {
    const fakes = world();
    const library = new LibraryBooks(fakes.container);
    const first = library.load();
    at(fakes.lists, 0).settle(err({ kind: 'storage-unavailable' }));
    await first;

    const retry = library.load();
    expect(library.state).toEqual({ kind: 'loading' });
    at(fakes.lists, 1).settle(ok([book('one')]));
    await retry;

    expect(library.failure).toBeNull();
    expect(library.books).toHaveLength(1);
  });

  it('keeps a book whose cover cannot be read', async () => {
    const fakes = world();
    fakes.cover.outcome = err({ kind: 'not-found', id: bookId('one') });

    const library = await loaded([book('one')], fakes);

    expect(library.state.kind).toBe('ready');
    expect(library.books).toHaveLength(1);
    expect(library.covers.size).toBe(0);
  });

  it('revokes every object URL it created when disposed, and keeps the books', async () => {
    const library = await loaded([book('one'), book('two')]);

    library.dispose();

    expect(revoked).toEqual(created);
    expect(library.covers.size).toBe(0);
    expect(library.books).toHaveLength(2);
  });

  it('revokes the replaced object URLs on a second load', async () => {
    const fakes = world();
    const library = await loaded([book('one')], fakes);

    const second = library.load();
    at(fakes.lists, 1).settle(ok([book('one')]));
    await second;

    expect(revoked).toEqual([created[0]]);
    expect(library.covers.get(bookId('one'))).toBe(created[1]);
  });

  it('lets the later of two overlapping loads win', async () => {
    const fakes = world();
    const library = new LibraryBooks(fakes.container);

    const first = library.load();
    const second = library.load();

    at(fakes.lists, 1).settle(ok([book('late')]));
    await second;
    at(fakes.lists, 0).settle(ok([book('early')]));
    await first;

    expect(library.books.map((b) => b.id)).toEqual(['late']);
    expect(library.state.kind).toBe('ready');
  });

  it('revokes the covers a stale load created', async () => {
    const fakes = world();
    const library = new LibraryBooks(fakes.container);
    const held = deferred<void>();
    fakes.cover.gate = () => held.promise;

    const first = library.load();
    at(fakes.lists, 0).settle(ok([book('early')]));
    await settleMicrotasks();

    fakes.cover.gate = () => Promise.resolve();
    const second = library.load();
    at(fakes.lists, 1).settle(ok([book('late')]));
    await second;

    held.settle();
    await first;

    expect(library.books.map((b) => b.id)).toEqual(['late']);
    expect(library.covers.size).toBe(1);
    expect(revoked).toEqual([created[1]]);
  });

  it('lists each book for search with the direction its layout reads in', async () => {
    const library = await loaded([
      book('manga', { addedAt: 2 }),
      book('strip', { addedAt: 1, layoutKind: 'continuous' }),
    ]);

    expect(library.searchedBooks).toEqual([
      { id: bookId('manga'), title: 'manga', language: 'ja', direction: 'rtl' },
      { id: bookId('strip'), title: 'strip', language: 'ja', direction: 'ltr' },
    ]);
  });

  it('counts the images of each book', async () => {
    const library = await loaded([book('one', { imageCount: 12 })]);

    expect(library.imageCounts).toEqual(new Map([[bookId('one'), 12]]));
  });
});
