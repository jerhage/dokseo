import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { imagePlace } from '$lib/shared/reading-place';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';
import type { IntrinsicSourceKind, PageList } from '../domain/book/page-list';
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
    sourceKind: 'pdf',
    contentHash: contentHash('a1'),
    fileName: 'book.pdf',
    imageCount: 182,
    addedAt: 1758240000000,
    position: imagePlace(imageIndex(0)),
    lastReadAt: null,
    finishedAt: null,
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
    sizes: () => Promise.resolve(ok([])),
    close,
    [Symbol.dispose]: close,
  };
}

function fakeRepository(
  record: Result<Book, LibraryError> = ok(book()),
  source: Result<Blob | null, LibraryError> = ok(new Blob(['source bytes'])),
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
    readPageList: () => Promise.resolve(ok({ kind: 'unlisted' as const })),
    savePageList: () => Promise.resolve(ok(undefined)),
  };
}

type OpenCall = { readonly sourceKind: IntrinsicSourceKind; readonly blob: Blob };

function fakeOpener(outcome: Result<PageSource, PageSourceError> = ok(fakePageSource())) {
  const calls: OpenCall[] = [];
  const openPages = (sourceKind: IntrinsicSourceKind, blob: Blob) => {
    calls.push({ sourceKind, blob });
    return Promise.resolve(outcome);
  };
  return { openPages, calls };
}

function deps(over: Partial<OpenForReadingDeps> = {}): OpenForReadingDeps {
  return {
    repository: fakeRepository(),
    openPages: fakeOpener().openPages,
    openListedPages: () => Promise.resolve(ok(fakePageSource())),
    listPageNames: () => Promise.resolve(ok([])),
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
    expect(result.ok && result.value.kind).toBe('images');
    expect(result.ok && result.value.book).toBe(stored);
    expect(result.ok && result.value.kind === 'images' && result.value.pages).toBe(pages);
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

  it('reports the missing source file apart from a removed book', async () => {
    const result = await openForReading(
      deps({ repository: fakeRepository(ok(book()), ok(null)) }),
      ID,
    );
    expect(result).toEqual({ ok: false, error: { kind: 'source-missing', id: ID } });
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

  it('opens a flow book without asking for a page source', async () => {
    const opener = fakeOpener();
    const flowing = book({ layoutKind: 'flow', imageCount: 0 });

    const result = await openForReading(
      deps({ repository: fakeRepository(ok(flowing)), openPages: opener.openPages }),
      ID,
    );

    expect(result).toEqual(ok({ kind: 'flow', book: flowing }));
    expect(opener.calls).toEqual([]);
  });

  it('reads no source blob for a flow book', async () => {
    let read = 0;
    const repository = fakeRepository(ok(book({ layoutKind: 'flow', imageCount: 0 })));
    const counting: LibraryRepository = {
      ...repository,
      readSource: () => {
        read += 1;
        return Promise.resolve(ok(new Blob(['source bytes'])));
      },
    };

    await openForReading(deps({ repository: counting }), ID);

    expect(read).toBe(0);
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

type ListedOpenCall = { readonly blob: Blob; readonly names: readonly string[] };

function fakeListedOpener() {
  const calls: ListedOpenCall[] = [];
  const openListedPages = (blob: Blob, names: readonly string[]) => {
    calls.push({ blob, names });
    return Promise.resolve(ok(fakePageSource()));
  };
  return { openListedPages, calls };
}

function fakeLister(outcome: Result<readonly string[], PageSourceError>) {
  const calls: Blob[] = [];
  const listPageNames = (blob: Blob) => {
    calls.push(blob);
    return Promise.resolve(outcome);
  };
  return { listPageNames, calls };
}

function pageListRepository(
  initial: PageList,
  saving: Result<void, LibraryError> = ok(undefined),
  blob: Blob = new Blob(['zip bytes']),
) {
  let pageList = initial;
  const saved: (readonly [BookId, readonly string[]])[] = [];
  const repository: LibraryRepository = {
    ...fakeRepository(ok(book({ sourceKind: 'archive' })), ok(blob)),
    readPageList: () => Promise.resolve(ok(pageList)),
    savePageList: (id, names) => {
      saved.push([id, names]);
      if (saving.ok) pageList = { kind: 'listed', names };
      return Promise.resolve(saving);
    },
  };
  return { repository, saved };
}

const RULE_NAMES = ['001.jpg', '002.jpg', '003.jpg'];

describe('openForReading a book of listed pages', () => {
  it('opens the pages its stored list names, in that order, without listing the archive again', async () => {
    const stored = ['.cover.jpg', '002.jpg', '001.jpg'];
    const blob = new Blob(['zip bytes']);
    const { repository, saved } = pageListRepository(
      { kind: 'listed', names: stored },
      ok(undefined),
      blob,
    );
    const opener = fakeListedOpener();
    const lister = fakeLister(ok(RULE_NAMES));

    const result = await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: lister.listPageNames,
      }),
      ID,
    );

    expect(result.ok && result.value.kind).toBe('images');
    expect(opener.calls).toEqual([{ blob, names: stored }]);
    expect(lister.calls).toEqual([]);
    expect(saved).toEqual([]);
  });

  it('lists an unlisted book by the current rule, stores that list, and opens it', async () => {
    const blob = new Blob(['zip bytes']);
    const { repository, saved } = pageListRepository({ kind: 'unlisted' }, ok(undefined), blob);
    const opener = fakeListedOpener();
    const lister = fakeLister(ok(RULE_NAMES));

    await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: lister.listPageNames,
      }),
      ID,
    );

    expect(lister.calls).toEqual([blob]);
    expect(saved).toEqual([[ID, RULE_NAMES]]);
    expect(opener.calls).toEqual([{ blob, names: RULE_NAMES }]);
  });

  it('stores the list of an unlisted book once, and opens it by that list after', async () => {
    const { repository, saved } = pageListRepository({ kind: 'unlisted' });
    const opener = fakeListedOpener();
    const lister = fakeLister(ok(RULE_NAMES));
    const opening = deps({
      repository,
      openListedPages: opener.openListedPages,
      listPageNames: lister.listPageNames,
    });

    await openForReading(opening, ID);
    await openForReading(opening, ID);

    expect(lister.calls).toHaveLength(1);
    expect(saved).toHaveLength(1);
    expect(opener.calls.map((call) => call.names)).toEqual([RULE_NAMES, RULE_NAMES]);
  });

  it('reports a source error and stores nothing when the archive will not list', async () => {
    const { repository, saved } = pageListRepository({ kind: 'unlisted' });
    const unreadable = err<PageSourceError>({ kind: 'source-unreadable', cause: 'corrupt' });

    const result = await openForReading(
      deps({ repository, listPageNames: fakeLister(unreadable).listPageNames }),
      ID,
    );

    expect(result).toEqual(
      err({ kind: 'source', error: { kind: 'source-unreadable', cause: 'corrupt' } }),
    );
    expect(saved).toEqual([]);
  });

  it('reports a library error and opens nothing when the list will not store', async () => {
    const failing = err<LibraryError>({ kind: 'storage-failed', cause: 'quota' });
    const { repository } = pageListRepository({ kind: 'unlisted' }, failing);
    const opener = fakeListedOpener();

    const result = await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: fakeLister(ok(RULE_NAMES)).listPageNames,
      }),
      ID,
    );

    expect(result).toEqual(
      err({ kind: 'library', error: { kind: 'storage-failed', cause: 'quota' } }),
    );
    expect(opener.calls).toEqual([]);
  });

  it('reports a source error when the archive lacks a page its list names', async () => {
    const { repository } = pageListRepository({ kind: 'listed', names: ['001.jpg'] });
    const missing = err<PageSourceError>({ kind: 'source-unreadable', cause: 'no 001.jpg' });

    const result = await openForReading(
      deps({ repository, openListedPages: () => Promise.resolve(missing) }),
      ID,
    );

    expect(result).toEqual(
      err({ kind: 'source', error: { kind: 'source-unreadable', cause: 'no 001.jpg' } }),
    );
  });

  it('opens a book made from loose images by its list too', async () => {
    const { repository } = pageListRepository({ kind: 'listed', names: ['p1.png'] });
    const images: LibraryRepository = {
      ...repository,
      get: () => Promise.resolve(ok(book({ sourceKind: 'images' }))),
    };
    const opener = fakeListedOpener();
    const intrinsic = fakeOpener();

    await openForReading(
      deps({
        repository: images,
        openListedPages: opener.openListedPages,
        openPages: intrinsic.openPages,
      }),
      ID,
    );

    expect(opener.calls.map((call) => call.names)).toEqual([['p1.png']]);
    expect(intrinsic.calls).toEqual([]);
  });

  it('reads no page list for a PDF', async () => {
    let read = 0;
    const counting: LibraryRepository = {
      ...fakeRepository(),
      readPageList: () => {
        read += 1;
        return Promise.resolve(ok({ kind: 'unlisted' as const }));
      },
    };

    await openForReading(deps({ repository: counting }), ID);

    expect(read).toBe(0);
  });
});
