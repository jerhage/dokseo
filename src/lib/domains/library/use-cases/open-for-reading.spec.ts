import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { PageNamesRead, PageSource, PageSourceOpening } from '$lib/shared/page-source';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import type { Book } from '../domain/book/book';
import type {
  BookLookup,
  HeldBookLookup,
  FileLookup,
  LibraryRepository,
  LibraryWrite,
} from '../domain/book/library-repository';
import type { IntrinsicSourceKind, PageList } from '../domain/book/page-list';
import { openForReading } from './open-for-reading';
import type { OpenForReadingDeps } from './open-for-reading';

const ID = bookId('book-7');

const NO_BOOK: BookLookup = { kind: 'success', book: null };

const WRITTEN: LibraryWrite = { kind: 'success' };

function found(held: Book): BookLookup {
  return { kind: 'success', book: held };
}

function file(blob: Blob | null): FileLookup {
  return { kind: 'success', file: blob };
}

function opened(pages: PageSource): PageSourceOpening {
  return { kind: 'success', pages };
}

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: ID,
    title: 'Yotsuba&! 1',
    alias: null,
    seriesId: null,
    volume: null,
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
    Promise.resolve({ kind: 'out-of-range' as const, index, count: 182 });

  return {
    count: 182,
    picture: missing,
    image: missing,
    sizes: () => Promise.resolve({ kind: 'success' as const, sizes: [] }),
    close,
    [Symbol.dispose]: close,
  };
}

function fakeRepository(
  record: HeldBookLookup = found(book()),
  source: FileLookup = file(new Blob(['source bytes'])),
): LibraryRepository {
  return {
    list: () => Promise.resolve({ kind: 'success', books: [], unreadable: [] }),
    get: () => Promise.resolve(record),
    add: () => Promise.resolve(WRITTEN),
    remove: () => Promise.resolve(WRITTEN),
    update: () => Promise.resolve(NO_BOOK),
    readSource: () => Promise.resolve(source),
    readCover: () => Promise.resolve(file(null)),
    storedBytes: () => Promise.resolve({ kind: 'success', bytes: 0 }),
    readPageList: () => Promise.resolve({ kind: 'success', pageList: { kind: 'unlisted' } }),
    savePageList: () => Promise.resolve(WRITTEN),
    listRemoved: () => Promise.resolve({ kind: 'success', removed: [] }),
    listRestorable: () => Promise.resolve({ kind: 'success', removed: [], unreadable: [] }),
    addRemoved: () => Promise.reject(new Error('not used')),
    forgetRemoved: () => Promise.resolve({ kind: 'success' }),
  };
}

type OpenCall = { readonly sourceKind: IntrinsicSourceKind; readonly blob: Blob };

function fakeOpener(outcome: PageSourceOpening = opened(fakePageSource())) {
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
    openListedPages: () => Promise.resolve(opened(fakePageSource())),
    listPageNames: () => Promise.resolve({ kind: 'success', names: [] }),
    ...over,
  };
}

describe('openForReading', () => {
  it('returns the book and the page source on the happy path', async () => {
    const pages = fakePageSource();
    const stored = book();
    const result = await openForReading(
      deps({
        repository: fakeRepository(found(stored)),
        openPages: fakeOpener(opened(pages)).openPages,
      }),
      ID,
    );
    expect(result).toEqual({ kind: 'images', book: stored, pages });
  });

  it('answers not-found when the record is missing', async () => {
    const result = await openForReading(deps({ repository: fakeRepository(NO_BOOK) }), ID);
    expect(result).toEqual({ kind: 'not-found', id: ID });
  });

  it('answers unreadable-book, and reads no source, for a stored row it cannot read', async () => {
    const read: string[] = [];
    const repository: LibraryRepository = {
      ...fakeRepository({
        kind: 'unreadable-book',
        book: { id: ID, title: 'Kino', alias: null, contentHash: '', fileName: '' },
      }),
      readSource: () => {
        read.push('source');
        return Promise.resolve(file(null));
      },
    };

    const result = await openForReading(deps({ repository }), ID);

    expect(result).toEqual({ kind: 'unreadable-book', id: ID });
    expect(read).toEqual([]);
  });

  it('passes a blocked store through when the source cannot be read', async () => {
    const result = await openForReading(
      deps({ repository: fakeRepository(found(book()), STORAGE_UNAVAILABLE) }),
      ID,
    );
    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('reports the missing source file apart from a removed book', async () => {
    const result = await openForReading(
      deps({ repository: fakeRepository(found(book()), file(null)) }),
      ID,
    );
    expect(result).toEqual({ kind: 'source-missing', id: ID });
  });

  it('reports an unreadable source when the page source will not open', async () => {
    const result = await openForReading(
      deps({
        openPages: fakeOpener({ kind: 'source-unreadable', cause: 'the archive is corrupt' })
          .openPages,
      }),
      ID,
    );
    expect(result).toEqual({
      kind: 'unreadable',
      failure: { kind: 'source-unreadable', cause: 'the archive is corrupt' },
    });
  });

  it('opens a flow book without asking for a page source or reading its source blob', async () => {
    const opener = fakeOpener();
    const flowing = book({ layoutKind: 'flow', imageCount: 0 });
    let read = 0;
    const counting: LibraryRepository = {
      ...fakeRepository(found(flowing)),
      readSource: () => {
        read += 1;
        return Promise.resolve(file(new Blob(['source bytes'])));
      },
    };

    const result = await openForReading(
      deps({ repository: counting, openPages: opener.openPages }),
      ID,
    );

    expect(result).toEqual({ kind: 'flow', book: flowing });
    expect(opener.calls).toEqual([]);
    expect(read).toBe(0);
  });

  it("passes the book's own source kind and the blob it read to the opener", async () => {
    const blob = new Blob(['pdf bytes']);
    const opener = fakeOpener();
    await openForReading(
      deps({
        repository: fakeRepository(found(book({ sourceKind: 'pdf' })), file(blob)),
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
    return Promise.resolve(opened(fakePageSource()));
  };
  return { openListedPages, calls };
}

function fakeLister(outcome: PageNamesRead) {
  const calls: Blob[] = [];
  const listPageNames = (blob: Blob) => {
    calls.push(blob);
    return Promise.resolve(outcome);
  };
  return { listPageNames, calls };
}

function pageListRepository(
  initial: PageList,
  saving: LibraryWrite = WRITTEN,
  blob: Blob = new Blob(['zip bytes']),
) {
  let pageList = initial;
  const saved: (readonly [BookId, readonly string[]])[] = [];
  const repository: LibraryRepository = {
    ...fakeRepository(found(book({ sourceKind: 'archive' })), file(blob)),
    readPageList: () => Promise.resolve({ kind: 'success', pageList }),
    savePageList: (id, names) => {
      saved.push([id, names]);
      if (saving.kind === 'success') pageList = { kind: 'listed', names };
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
      WRITTEN,
      blob,
    );
    const opener = fakeListedOpener();
    const lister = fakeLister({ kind: 'success', names: RULE_NAMES });

    const result = await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: lister.listPageNames,
      }),
      ID,
    );

    expect(result.kind).toBe('images');
    expect(opener.calls).toEqual([{ blob, names: stored }]);
    expect(lister.calls).toEqual([]);
    expect(saved).toEqual([]);
  });

  it('lists an unlisted book by the current rule, stores that list, and opens it', async () => {
    const blob = new Blob(['zip bytes']);
    const { repository, saved } = pageListRepository({ kind: 'unlisted' }, WRITTEN, blob);
    const opener = fakeListedOpener();
    const lister = fakeLister({ kind: 'success', names: RULE_NAMES });

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

  it('reports an unreadable source and stores nothing when the archive will not list', async () => {
    const { repository, saved } = pageListRepository({ kind: 'unlisted' });

    const result = await openForReading(
      deps({
        repository,
        listPageNames: fakeLister({ kind: 'source-unreadable', cause: 'corrupt' }).listPageNames,
      }),
      ID,
    );

    expect(result).toEqual({
      kind: 'unreadable',
      failure: { kind: 'source-unreadable', cause: 'corrupt' },
    });
    expect(saved).toEqual([]);
  });

  it('reports an unreadable source naming the page list, and lists, stores and opens nothing, when the stored list is unreadable', async () => {
    const cause = 'A stored page list lacks its page names';
    const { repository, saved } = pageListRepository({ kind: 'unreadable', cause });
    const opener = fakeListedOpener();
    const lister = fakeLister({ kind: 'success', names: RULE_NAMES });

    const result = await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: lister.listPageNames,
      }),
      ID,
    );

    expect(result).toEqual({ kind: 'unreadable', failure: { kind: 'source-unreadable', cause } });
    expect(lister.calls).toEqual([]);
    expect(saved).toEqual([]);
    expect(opener.calls).toEqual([]);
  });

  it('passes a blocked store through and opens nothing when the list will not store', async () => {
    const { repository } = pageListRepository({ kind: 'unlisted' }, STORAGE_UNAVAILABLE);
    const opener = fakeListedOpener();

    const result = await openForReading(
      deps({
        repository,
        openListedPages: opener.openListedPages,
        listPageNames: fakeLister({ kind: 'success', names: RULE_NAMES }).listPageNames,
      }),
      ID,
    );

    expect(result).toEqual(STORAGE_UNAVAILABLE);
    expect(opener.calls).toEqual([]);
  });

  it('reports an unreadable source when the archive lacks a page its list names', async () => {
    const { repository } = pageListRepository({ kind: 'listed', names: ['001.jpg'] });

    const result = await openForReading(
      deps({
        repository,
        openListedPages: () =>
          Promise.resolve({ kind: 'source-unreadable', cause: 'no 001.jpg' } as const),
      }),
      ID,
    );

    expect(result).toEqual({
      kind: 'unreadable',
      failure: { kind: 'source-unreadable', cause: 'no 001.jpg' },
    });
  });

  it('opens a book made from loose images by its list too', async () => {
    const { repository } = pageListRepository({ kind: 'listed', names: ['p1.png'] });
    const images: LibraryRepository = {
      ...repository,
      get: () => Promise.resolve(found(book({ sourceKind: 'images' }))),
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
});
