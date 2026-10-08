import { describe, expect, it } from 'vitest';
import { bookId, catalogId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { fakePasswords } from './fake-passwords';
import type { BookOrigin } from '../domain/book-origin';
import type { Catalog } from '../domain/catalog';
import type { CatalogRepository } from '../domain/catalog-repository';
import { HOME_ROOT_FEED, HOME_SEARCH, SHELF_FICTION_FEED } from '../domain/catalog-feed-fixtures';
import type {
  CatalogSource,
  CatalogSourceFor,
  DownloadResult,
  ReadFeedResult,
} from '../domain/catalog-source';
import type { OriginRepository } from '../domain/origin-repository';
import type { Acquisition, RemotePublication } from '../domain/remote-publication';
import { browseCatalog } from './browse-catalog';
import type { ReadBook } from './browse-catalog';
import { downloadPublication } from './download-publication';
import type { OpenFile } from './download-publication';
import { forgetOrigin } from './forget-origin';
import { readCatalogCover } from './read-catalog-cover';
import { searchCatalog } from './search-catalog';
import { updatePublication } from './update-publication';
import type { ReplaceFile } from './update-publication';

const OPEN = catalogId('open');
const PRIVATE = catalogId('private');
const ENTRY = 'https://example.org/book/42';
const PROGRESS = () => undefined;

const ACQUISITION: Acquisition = {
  href: 'https://example.org/files/42.cbz',
  format: 'cbz',
  mediaType: 'application/vnd.comicbook+zip',
  length: 2048,
};

const PUBLICATION: RemotePublication = {
  catalogId: OPEN,
  entryId: ENTRY,
  title: 'The Lantern Maker',
  authors: [],
  language: null,
  summary: '',
  updated: '2026-07-01T00:00:00Z',
  cover: null,
  acquisition: ACQUISITION,
  feedPath: [{ title: 'Fiction', href: 'https://example.org/opds/fiction' }],
};

const CATALOGS: ReadonlyMap<string, Catalog> = new Map([
  [
    OPEN,
    {
      id: OPEN,
      title: 'Open',
      protocol: 'opds1' as const,
      rootUrl: 'https://example.org/opds',
      auth: { kind: 'none' },
    },
  ],
  [
    PRIVATE,
    {
      id: PRIVATE,
      title: 'Private',
      protocol: 'opds1' as const,
      rootUrl: 'https://private.example/opds',
      auth: { kind: 'basic', username: 'jo' },
    },
  ],
]);

function origin(book: BookId, entry: string): BookOrigin {
  return {
    bookId: book,
    catalogId: OPEN,
    entryId: entry,
    acquisition: ACQUISITION,
    updated: '2026-06-01T00:00:00Z',
    feedPath: [],
    feedPosition: 0,
    downloadedAt: 1,
  };
}

function setup(feed: ReadFeedResult = { kind: 'success', reading: SHELF_FICTION_FEED }) {
  const requests: string[] = [];
  const credentialsSeen: unknown[] = [];
  let downloadAnswer: DownloadResult = {
    kind: 'success',
    file: new File(['x'], 'x.cbz'),
  };

  const source: CatalogSource = {
    readFeed: (address, _placement, credentials) => {
      requests.push(`feed ${address}`);
      credentialsSeen.push(credentials);
      return Promise.resolve(feed);
    },
    search: (search, query, _placement, credentials) => {
      requests.push(`search ${search.handle} for ${query}`);
      credentialsSeen.push(credentials);
      return Promise.resolve(feed);
    },
    readImage: (url, credentials) => {
      requests.push(`image ${url}`);
      credentialsSeen.push(credentials);
      return Promise.resolve({ kind: 'success', image: new Blob(['i']) });
    },
    download: (acquisition, credentials, fallbackName, onProgress) => {
      requests.push(`download ${acquisition.href} as ${fallbackName}`);
      credentialsSeen.push(credentials);
      onProgress(0.5);
      return Promise.resolve(downloadAnswer);
    },
  };

  const protocols: string[] = [];
  const sourceFor: CatalogSourceFor = (protocol) => {
    protocols.push(protocol);
    return Promise.resolve(source);
  };

  const catalogs: CatalogRepository = {
    list: () =>
      Promise.resolve({ kind: 'success', catalogs: [...CATALOGS.values()], unreadable: [] }),
    get: (id) => Promise.resolve({ kind: 'success', catalog: CATALOGS.get(id) ?? null }),
    save: () => Promise.resolve({ kind: 'success' }),
    remove: () => Promise.resolve({ kind: 'success' }),
  };

  const rows = new Map<BookId, BookOrigin>();
  const deleted: BookId[] = [];
  const origins: OriginRepository = {
    put: (added) => {
      rows.set(added.bookId, added);
      return Promise.resolve({ kind: 'success' });
    },
    listAll: () =>
      Promise.resolve({ kind: 'success', origins: [...rows.values()], unreadable: [] }),
    listByCatalog: (id) =>
      Promise.resolve({
        kind: 'success',
        origins: [...rows.values()].filter((found) => found.catalogId === id),
        unreadable: [],
      }),
    find: () => Promise.resolve({ kind: 'success', origin: null }),
    deleteByBook: (id) => {
      deleted.push(id);
      rows.delete(id);
      return Promise.resolve({ kind: 'success' });
    },
    deleteByCatalog: () => Promise.resolve({ kind: 'success' }),
  };

  const passwords = fakePasswords();
  const liveBooks = new Set<BookId>();
  const readBook: ReadBook = (id) =>
    Promise.resolve(
      liveBooks.has(id) ? { kind: 'success', book: { id } as never } : { kind: 'not-found', id },
    );

  return {
    sourceFor,
    protocols,
    catalogs,
    origins,
    passwords,
    readBook,
    rows,
    deleted,
    liveBooks,
    requests,
    credentialsSeen,
    answerDownload: (answer: DownloadResult) => {
      downloadAnswer = answer;
    },
  };
}

describe('browseCatalog', () => {
  it('reads the root url of the catalog when no url is given', async () => {
    const world = setup({ kind: 'success', reading: HOME_ROOT_FEED });

    const browsed = await browseCatalog(world, OPEN, null, []);

    expect(browsed.kind === 'success' && browsed.reading.kind).toBe('navigation');
    expect(world.requests).toEqual(['feed https://example.org/opds']);
  });

  it('asks for the source of the protocol the catalog speaks', async () => {
    const world = setup();

    await browseCatalog(world, OPEN, null, []);

    expect(world.protocols).toEqual(['opds1']);
  });

  it('asks for no source when the catalog is locked', async () => {
    const world = setup();

    await browseCatalog(world, PRIVATE, null, []);

    expect(world.protocols).toEqual([]);
  });

  it('answers client outcomes unchanged', async () => {
    const world = setup({ kind: 'server-error', status: 500 });

    expect(await browseCatalog(world, OPEN, null, [])).toEqual({
      kind: 'server-error',
      status: 500,
    });
  });

  it('answers not-a-catalog when the source cannot read the response as a catalog', async () => {
    const world = setup({ kind: 'not-a-catalog' });

    expect(await browseCatalog(world, OPEN, null, [])).toEqual({ kind: 'not-a-catalog' });
  });

  it('answers unknown-catalog for an id nothing holds', async () => {
    const world = setup();

    expect(await browseCatalog(world, catalogId('ghost'), null, [])).toEqual({
      kind: 'unknown-catalog',
      id: catalogId('ghost'),
    });
    expect(world.requests).toEqual([]);
  });

  it('answers locked without a request when a basic catalog has no password', async () => {
    const world = setup();

    expect(await browseCatalog(world, PRIVATE, null, [])).toEqual({
      kind: 'locked',
      id: PRIVATE,
    });
    expect(world.requests).toEqual([]);
  });

  it('sends the unlocked password as basic credentials', async () => {
    const world = setup();
    world.passwords.set(PRIVATE, 'secret');

    await browseCatalog(world, PRIVATE, null, []);

    expect(world.credentialsSeen).toEqual([{ kind: 'basic', username: 'jo', password: 'secret' }]);
  });

  it('maps an entry to the link of its origin when the book is held', async () => {
    const world = setup();
    const book = bookId('b1');
    world.liveBooks.add(book);
    world.rows.set(book, origin(book, ENTRY));

    const browsed = await browseCatalog(world, OPEN, null, []);

    expect(browsed.kind === 'success' && [...browsed.held.entries()]).toEqual([
      [ENTRY, { bookId: book, updated: '2026-06-01T00:00:00Z' }],
    ]);
    expect(world.deleted).toEqual([]);
  });

  it('deletes the origin of a removed book and does not return it as held', async () => {
    const world = setup();
    const book = bookId('b1');
    world.rows.set(book, origin(book, ENTRY));

    const browsed = await browseCatalog(world, OPEN, null, []);

    expect(browsed.kind === 'success' && browsed.held.size).toBe(0);
    expect(world.deleted).toEqual([book]);
    expect(world.rows.size).toBe(0);
  });

  it('leaves the origins of entries outside the feed alone', async () => {
    const world = setup();
    const book = bookId('b1');
    world.rows.set(book, origin(book, 'urn:other'));

    await browseCatalog(world, OPEN, null, []);

    expect(world.deleted).toEqual([]);
  });

  it('passes storage unavailable on from the held check', async () => {
    const world = setup();
    const unavailable: ReadBook = () => Promise.resolve(STORAGE_UNAVAILABLE);
    const book = bookId('b1');
    world.rows.set(book, origin(book, ENTRY));

    expect(await browseCatalog({ ...world, readBook: unavailable }, OPEN, null, [])).toEqual(
      STORAGE_UNAVAILABLE,
    );
  });
});

describe('searchCatalog', () => {
  it('hands the opaque search and the query to the source and checks the held entries', async () => {
    const world = setup();
    const book = bookId('b1');
    world.liveBooks.add(book);
    world.rows.set(book, origin(book, ENTRY));

    const searched = await searchCatalog(world, OPEN, HOME_SEARCH, 'lantern', []);

    expect(world.requests).toEqual([`search ${HOME_SEARCH.handle} for lantern`]);
    expect(searched.kind === 'success' && [...searched.held.keys()]).toEqual([ENTRY]);
  });

  it('answers locked without a request when a basic catalog has no password', async () => {
    const world = setup();

    expect(await searchCatalog(world, PRIVATE, HOME_SEARCH, 'lantern', [])).toEqual({
      kind: 'locked',
      id: PRIVATE,
    });
    expect(world.requests).toEqual([]);
  });

  it('answers the source outcomes unchanged', async () => {
    const world = setup({ kind: 'not-a-catalog' });

    expect(await searchCatalog(world, OPEN, HOME_SEARCH, 'lantern', [])).toEqual({
      kind: 'not-a-catalog',
    });
  });
});

describe('readCatalogCover', () => {
  it('reads the image with the credentials of the catalog', async () => {
    const world = setup();
    world.passwords.set(PRIVATE, 'secret');

    const cover = await readCatalogCover(world, PRIVATE, 'https://private.example/c.png');

    expect(cover.kind).toBe('success');
    expect(world.credentialsSeen).toEqual([{ kind: 'basic', username: 'jo', password: 'secret' }]);
  });

  it('answers locked without a request', async () => {
    const world = setup();

    expect(await readCatalogCover(world, PRIVATE, 'https://private.example/c.png')).toEqual({
      kind: 'locked',
      id: PRIVATE,
    });
    expect(world.requests).toEqual([]);
  });
});

function downloading(world: ReturnType<typeof setup>, opened: Awaited<ReturnType<OpenFile>>) {
  const openFile: OpenFile = () => Promise.resolve(opened);
  const deps = { ...world, openFile, now: () => 1234 };
  return downloadPublication(deps, PUBLICATION, 3, {} as never, {} as never, PROGRESS);
}

describe('downloadPublication', () => {
  const held = { id: bookId('held-book') } as never;

  it.each([
    { kind: 'added', book: held },
    { kind: 'restored', book: held },
    { kind: 'already-held', book: held, merge: {} as never },
  ] as const)('records the origin when openFile answers $kind', async (opened) => {
    const world = setup();

    const result = await downloading(world, opened);

    expect(result).toEqual({ kind: 'success', bookId: bookId('held-book') });
    expect(world.rows.get(bookId('held-book'))).toEqual({
      bookId: bookId('held-book'),
      catalogId: OPEN,
      entryId: ENTRY,
      acquisition: ACQUISITION,
      updated: '2026-07-01T00:00:00Z',
      feedPath: PUBLICATION.feedPath,
      feedPosition: 3,
      downloadedAt: 1234,
    });
  });

  it('names the fallback file from the title and the format', async () => {
    const world = setup();

    await downloading(world, { kind: 'added', book: held });

    expect(world.requests).toEqual([
      'download https://example.org/files/42.cbz as The Lantern Maker.cbz',
    ]);
  });

  it('passes any other openFile answer on and writes no origin', async () => {
    const world = setup();
    const refused = { kind: 'fingerprint', cause: 'bad' } as const;

    expect(await downloading(world, refused)).toEqual(refused);
    expect(world.rows.size).toBe(0);
  });

  it('passes storage unavailable from openFile on and writes no origin', async () => {
    const world = setup();

    expect(await downloading(world, STORAGE_UNAVAILABLE)).toEqual(STORAGE_UNAVAILABLE);
    expect(world.rows.size).toBe(0);
  });

  it('answers unsupported without a request when the entry has no acquisition', async () => {
    const world = setup();
    const openFile: OpenFile = () => Promise.reject(new Error('never'));

    const result = await downloadPublication(
      { ...world, openFile, now: () => 1 },
      { ...PUBLICATION, acquisition: null },
      0,
      {} as never,
      {} as never,
      PROGRESS,
    );

    expect(result).toEqual({ kind: 'unsupported' });
    expect(world.requests).toEqual([]);
  });

  it('answers client outcomes and writes no origin', async () => {
    const world = setup();
    world.answerDownload({ kind: 'blocked' });

    expect(await downloading(world, { kind: 'added', book: held })).toEqual({ kind: 'blocked' });
    expect(world.rows.size).toBe(0);
  });

  it('answers locked without a request for a basic catalog with no password', async () => {
    const world = setup();
    const openFile: OpenFile = () => Promise.reject(new Error('never'));

    const result = await downloadPublication(
      { ...world, openFile, now: () => 1 },
      { ...PUBLICATION, catalogId: PRIVATE },
      0,
      {} as never,
      {} as never,
      PROGRESS,
    );

    expect(result).toEqual({ kind: 'locked', id: PRIVATE });
    expect(world.requests).toEqual([]);
  });

  it('never hands the repository a password', async () => {
    const world = setup();
    world.passwords.set(PRIVATE, 'secret');

    await downloadPublication(
      { ...world, openFile: () => Promise.resolve({ kind: 'added', book: held }), now: () => 1 },
      { ...PUBLICATION, catalogId: PRIVATE },
      0,
      {} as never,
      {} as never,
      PROGRESS,
    );

    expect(JSON.stringify([...world.rows.values()])).not.toContain('secret');
  });
});

function updating(world: ReturnType<typeof setup>, replaced: Awaited<ReturnType<ReplaceFile>>) {
  const replaceCalls: { id: BookId; files: readonly File[] }[] = [];
  const replaceBookFile: ReplaceFile = (id, files) => {
    replaceCalls.push({ id, files });
    return Promise.resolve(replaced);
  };
  const deps = { ...world, replaceBookFile, now: () => 5678 };
  const result = updatePublication(deps, PUBLICATION, bookId('held-book'), 7, PROGRESS);
  return { result, replaceCalls };
}

describe('updatePublication', () => {
  const book = { id: bookId('held-book') } as never;

  it.each([
    { kind: 'replaced', book },
    { kind: 'same-file', book },
  ] as const)(
    'records the origin with the new entry when the library answers $kind',
    async (answer) => {
      const world = setup();
      world.rows.set(bookId('held-book'), origin(bookId('held-book'), ENTRY));

      const { result, replaceCalls } = updating(world, answer);

      expect(await result).toEqual({ kind: 'success', bookId: bookId('held-book') });
      expect(replaceCalls.map((call) => call.id)).toEqual([bookId('held-book')]);
      expect(world.rows.get(bookId('held-book'))).toEqual({
        bookId: bookId('held-book'),
        catalogId: OPEN,
        entryId: ENTRY,
        acquisition: ACQUISITION,
        updated: '2026-07-01T00:00:00Z',
        feedPath: PUBLICATION.feedPath,
        feedPosition: 7,
        downloadedAt: 5678,
      });
    },
  );

  it('hands the downloaded file to the library under the held book', async () => {
    const world = setup();

    const { result, replaceCalls } = updating(world, { kind: 'replaced', book });
    await result;

    expect(world.requests).toEqual([
      'download https://example.org/files/42.cbz as The Lantern Maker.cbz',
    ]);
    expect(replaceCalls.map((call) => call.files.map((file) => file.name))).toEqual([['x.cbz']]);
  });

  it('answers book-missing when the library no longer holds the book, and writes no origin', async () => {
    const world = setup();

    const { result } = updating(world, { kind: 'not-found', id: bookId('held-book') });

    expect(await result).toEqual({ kind: 'book-missing', bookId: bookId('held-book') });
    expect(world.rows.size).toBe(0);
  });

  it('answers already-held with the other book, and writes no origin', async () => {
    const world = setup();

    const { result } = updating(world, {
      kind: 'already-held',
      book: { id: bookId('twin') } as never,
    });

    expect(await result).toEqual({ kind: 'already-held', bookId: bookId('twin') });
    expect(world.rows.size).toBe(0);
  });

  it('passes any other library answer on and writes no origin', async () => {
    const world = setup();
    const refused = { kind: 'fingerprint', cause: 'bad' } as const;

    expect(await updating(world, refused).result).toEqual(refused);
    expect(await updating(world, STORAGE_UNAVAILABLE).result).toEqual(STORAGE_UNAVAILABLE);
    expect(world.rows.size).toBe(0);
  });

  it('answers client outcomes without calling the library', async () => {
    const world = setup();
    world.answerDownload({ kind: 'blocked' });

    const { result, replaceCalls } = updating(world, { kind: 'replaced', book });

    expect(await result).toEqual({ kind: 'blocked' });
    expect(replaceCalls).toEqual([]);
  });

  it('answers unsupported without a request when the entry has no acquisition', async () => {
    const world = setup();
    const replaceBookFile: ReplaceFile = () => Promise.reject(new Error('never'));

    const result = await updatePublication(
      { ...world, replaceBookFile, now: () => 1 },
      { ...PUBLICATION, acquisition: null },
      bookId('held-book'),
      0,
      PROGRESS,
    );

    expect(result).toEqual({ kind: 'unsupported' });
    expect(world.requests).toEqual([]);
  });

  it('answers locked without a request for a basic catalog with no password', async () => {
    const world = setup();
    const replaceBookFile: ReplaceFile = () => Promise.reject(new Error('never'));

    const result = await updatePublication(
      { ...world, replaceBookFile, now: () => 1 },
      { ...PUBLICATION, catalogId: PRIVATE },
      bookId('held-book'),
      0,
      PROGRESS,
    );

    expect(result).toEqual({ kind: 'locked', id: PRIVATE });
    expect(world.requests).toEqual([]);
  });
});

describe('forgetOrigin', () => {
  it('deletes the origin of one book', async () => {
    const world = setup();
    const book = bookId('b1');
    world.rows.set(book, origin(book, ENTRY));

    expect(await forgetOrigin(world, book)).toEqual({ kind: 'success' });
    expect(world.rows.size).toBe(0);
  });
});
