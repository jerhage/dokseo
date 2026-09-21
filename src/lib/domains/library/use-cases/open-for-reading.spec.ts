import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Book, SourceKind } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import { openForReading } from './open-for-reading';
import type { OpenForReadingDeps } from './open-for-reading';

const ID = bookId('book-7');

function notFound(id: BookId): Result<never, LibraryError> {
  return err({ kind: 'not-found', id });
}

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: ID,
    title: 'Yotsuba&! 1',
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imageIndex(0),
    ...overrides,
  };
}

function fakePageSource(): PageSource {
  const close = (): void => undefined;
  const missing = (index: ImageIndex) =>
    Promise.resolve(
      err<PageSourceError>({
        kind: 'out-of-range',
        index,
        count: 182,
      }),
    );

  return {
    count: 182,
    picture: missing,
    image: missing,
    close,
    [Symbol.dispose]: close,
  };
}

function fakeRepository(
  record: Result<Book, LibraryError> = ok(book()),
  source: Result<Blob, LibraryError> = ok(new Blob(['source bytes'])),
): LibraryRepository {
  return {
    list: () => Promise.resolve(ok([])),
    get: () => Promise.resolve(record),
    add: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
    update: (id) => Promise.resolve(notFound(id)),
    readSource: () => Promise.resolve(source),
    readCover: (id) => Promise.resolve(notFound(id)),
    storedBytes: () => Promise.resolve(ok(0)),
  };
}

type OpenCall = { readonly sourceKind: SourceKind; readonly blob: Blob };

function fakeOpener(outcome: Result<PageSource, PageSourceError> = ok(fakePageSource())) {
  const calls: OpenCall[] = [];
  const openPages = (sourceKind: SourceKind, blob: Blob) => {
    calls.push({ sourceKind, blob });
    return Promise.resolve(outcome);
  };
  return { openPages, calls };
}

function deps(over: Partial<OpenForReadingDeps> = {}): OpenForReadingDeps {
  return {
    repository: fakeRepository(),
    openPages: fakeOpener().openPages,
    ...over,
  };
}

describe('openForReading', () => {
  it('returns the book and the page source on the happy path', async () => {
    const pages = fakePageSource();
    const stored = book();
    const result = await openForReading(
      deps({ repository: fakeRepository(ok(stored)), openPages: fakeOpener(ok(pages)).openPages }),
      ID,
    );
    expect(result.ok && result.value.book).toBe(stored);
    expect(result.ok && result.value.pages).toBe(pages);
  });

  it('reports a library error when the record is missing', async () => {
    const result = await openForReading(deps({ repository: fakeRepository(notFound(ID)) }), ID);
    expect(result).toEqual({
      ok: false,
      error: { kind: 'library', error: { kind: 'not-found', id: ID } },
    });
  });

  it('reports a library error when the source blob is missing', async () => {
    const missing = err<LibraryError>({ kind: 'storage-failed', cause: 'the file went away' });
    const result = await openForReading(
      deps({ repository: fakeRepository(ok(book()), missing) }),
      ID,
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: 'library', error: { kind: 'storage-failed', cause: 'the file went away' } },
    });
  });

  it('reports a source error when the page source will not open', async () => {
    const unreadable = err<PageSourceError>({
      kind: 'source-unreadable',
      cause: 'the archive is corrupt',
    });
    const result = await openForReading(deps({ openPages: fakeOpener(unreadable).openPages }), ID);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'source',
        error: { kind: 'source-unreadable', cause: 'the archive is corrupt' },
      },
    });
  });

  it('never opens a page source when the record is missing', async () => {
    const opener = fakeOpener();
    await openForReading(
      deps({ repository: fakeRepository(notFound(ID)), openPages: opener.openPages }),
      ID,
    );
    expect(opener.calls).toEqual([]);
  });

  it("passes the book's own source kind and the blob it read to the opener", async () => {
    const blob = new Blob(['pdf bytes']);
    const opener = fakeOpener();
    await openForReading(
      deps({
        repository: fakeRepository(ok(book({ sourceKind: 'pdf' })), ok(blob)),
        openPages: opener.openPages,
      }),
      ID,
    );
    expect(opener.calls).toHaveLength(1);
    expect(at(opener.calls, 0).sourceKind).toBe('pdf');
    expect(at(opener.calls, 0).blob).toBe(blob);
  });
});
