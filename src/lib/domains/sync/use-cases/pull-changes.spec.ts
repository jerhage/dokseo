import { describe, expect, it } from 'vitest';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import type { CatalogRepository } from '$lib/domains/catalog/domain/catalog-repository';
import type { BookOrigin } from '$lib/domains/catalog/domain/book-origin';
import type { OriginRepository } from '$lib/domains/catalog/domain/origin-repository';
import { applyEdit } from '$lib/domains/library/domain/book/book';
import { INITIAL_READING_DEFAULTS } from '$lib/domains/library/domain/book/reading-defaults';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { regionAnchor } from '$lib/shared/anchor';
import { changeMarker } from '$lib/shared/change-marker';
import type { AcceptedVersion, ChangeMarker, RecordVersion } from '$lib/shared/change-marker';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, catalogId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Change, ChangeData, StoredChange, SyncKind } from '../domain/change';
import type { HeldChangeStore } from '../domain/held-changes';
import type { TriedDownloadStore } from '../domain/tried-downloads';
import type { PullPage, PullResult, SyncServer } from '../domain/sync-server';
import type { SyncConnection, SyncStateStore } from '../domain/sync-state';
import { applyHeldChanges } from './apply-held-changes';
import { contractExample } from './contract-examples';
import { downloadRemoteBook } from './download-remote-book';
import type { DownloadPublication } from './download-remote-book';
import { listRemoteBooks } from './list-remote-books';
import { pullChanges } from './pull-changes';
import { syncNow } from './sync-now';

const DEVICE = '00000000-0000-4000-8000-000000000002';
const OTHER = '00000000-0000-4000-8000-000000000003';

const CONNECTION: SyncConnection = {
  serverUrl: 'https://sync.example/sync/',
  deviceId: DEVICE,
  deviceName: 'Phone',
  token: 'dsk_3f9a1c7e5b2d4a60',
  cursor: 0,
  lastSyncAt: null,
  autoDownload: false,
};

const HASH = contentHash('0123456789abcdef0123456789abcdef');
const CAPTURE_ID = captureId('00000000-0000-4000-8000-000000000001');
const TAG_ID = tagId('00000000-0000-4000-8000-000000000005');
const CATALOG_ID = catalogId('00000000-0000-4000-8000-000000000009');

const BOOK: Book = {
  id: bookId('local-book'),
  title: 'Yotsuba&!',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'ltr',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: HASH,
  fileName: 'yotsuba.cbz',
  imageCount: 100,
  addedAt: 1,
  position: imagePlace(imageIndex(3)),
  lastReadAt: 5,
  finishedAt: null,
};

const CAPTURE: Capture = {
  id: CAPTURE_ID,
  bookId: BOOK.id,
  anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.1, 0.2, 0.3, 0.25) }]),
  text: 'よつば',
  origin: 'written',
  createdAt: 10,
  editedAt: null,
  tagIds: [TAG_ID],
};

const TAG: Tag = { id: TAG_ID, name: 'old', colour: 'sage', createdAt: 3 };

const CATALOG: Catalog = {
  id: CATALOG_ID,
  title: 'Old title',
  protocol: 'opds1',
  rootUrl: 'https://books.example.net/opds',
  auth: { kind: 'none' },
};

function dataOf(folder: string, name: string): ChangeData {
  return contractExample(folder, name) as ChangeData;
}

const BOOK_DATA = dataOf('book-data', 'plain');
const BOOK_DATA_WITH_ORIGIN = dataOf('book-data', 'with-origin');
const POSITION_DATA = dataOf('position-data', 'image');
const TAG_DATA = dataOf('tag-data', 'tag');
const CATALOG_DATA = dataOf('catalog-data', 'basic');
const CAPTURE_DATA = dataOf('capture-data', 'written');

let counter = 0;

function incoming(
  kind: SyncKind,
  recordId: string,
  data: Change['data'],
  updatedAt: number,
  deviceId = OTHER,
): StoredChange {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    kind,
    recordId,
    data,
    updatedAt,
    deviceId,
    seq: counter,
    receivedAt: updatedAt,
  };
}

function keyOf(kind: SyncKind, recordId: string): string {
  return `${kind}:${recordId}`;
}

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function world(start: {
  books?: readonly Book[];
  captures?: readonly Capture[];
  tags?: readonly Tag[];
  catalogs?: readonly Catalog[];
  origins?: readonly BookOrigin[];
  autoDownload?: boolean;
  tried?: readonly string[];
  download?: DownloadPublication;
}) {
  let books = [...(start.books ?? [])];
  const removedBooks: string[] = [];
  const captures = new Map((start.captures ?? []).map((capture) => [capture.id, capture]));
  const tags = new Map((start.tags ?? []).map((tag) => [tag.id, tag]));
  const catalogs = new Map((start.catalogs ?? []).map((catalog) => [catalog.id, catalog]));
  const originRows = new Map<BookId, BookOrigin>(
    (start.origins ?? []).map((origin) => [origin.bookId, origin]),
  );
  const clearedOrigins: string[] = [];
  const markers = new Map<string, ChangeMarker>();
  const versions = new Map<string, RecordVersion>();
  const held = new Map<string, Change>();
  const cursors: number[] = [];
  const tried = new Set<string>(start.tried ?? []);
  let connection: SyncConnection = { ...CONNECTION, autoDownload: start.autoDownload ?? false };
  let unavailable = false;

  const accept = ({ kind, recordId, version }: AcceptedVersion): void => {
    versions.set(keyOf(kind, recordId), { kind, recordId, ...version });
    markers.delete(keyOf(kind, recordId));
  };
  const pendingOf = (...kinds: readonly SyncKind[]) =>
    Promise.resolve({
      kind: 'success',
      markers: [...markers.values()].filter((marker) => kinds.includes(marker.kind)),
    } as const);
  const versionsOf = (...kinds: readonly SyncKind[]) =>
    Promise.resolve({
      kind: 'success',
      versions: [...versions.values()].filter((version) => kinds.includes(version.kind)),
    } as const);
  const success = () => Promise.resolve({ kind: 'success' } as const);

  const shelf: LibraryRepository = {
    list: () => Promise.resolve({ kind: 'success', books, unreadable: [] } as const),
    pendingChanges: () => pendingOf('book', 'position'),
    recordVersions: () => versionsOf('book', 'position'),
    settleChanges: success,
    acceptRemoteVersion: (accepted) => {
      accept(accepted);
      return success();
    },
    applyRemote: (write) => {
      const book = books.find((candidate) => candidate.id === write.id);
      if (book === undefined) return Promise.resolve({ kind: 'not-found' } as const);
      if (write.kind === 'edit') {
        books = books.map((candidate) =>
          candidate === book ? applyEdit(book, write.edit) : candidate,
        );
      } else {
        books = books.filter((candidate) => candidate !== book);
        removedBooks.push(book.contentHash);
      }
      accept(write.accepted);
      return success();
    },
    get: notUsed,
    add: notUsed,
    replaceFile: notUsed,
    readPageList: notUsed,
    savePageList: notUsed,
    remove: notUsed,
    erase: notUsed,
    listRemoved: notUsed,
    listRestorable: notUsed,
    addRemoved: notUsed,
    forgetRemoved: notUsed,
    update: notUsed,
    readSource: notUsed,
    readCover: notUsed,
    markChanged: notUsed,
    storedBytes: notUsed,
  };

  const captureRepository: CaptureRepository = {
    pendingChanges: () => pendingOf('capture', 'tag'),
    recordVersions: () => versionsOf('capture', 'tag'),
    settleChanges: success,
    applyRemote: (write) => {
      if (write.kind === 'save-capture') captures.set(write.capture.id, write.capture);
      if (write.kind === 'remove-capture') captures.delete(write.id);
      if (write.kind === 'save-tag') tags.set(write.tag.id, write.tag);
      if (write.kind === 'remove-tag') {
        tags.delete(write.id);
        for (const [id, capture] of captures) {
          captures.set(id, {
            ...capture,
            tagIds: capture.tagIds.filter((tagged) => tagged !== write.id),
          });
        }
      }
      accept(write.accepted);
      return success();
    },
    listForBook: notUsed,
    listEverything: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
  };

  const catalogRepository: CatalogRepository & OriginRepository = {
    pendingChanges: () => pendingOf('catalog'),
    recordVersions: () => versionsOf('catalog'),
    settleChanges: success,
    applyRemote: (write) => {
      if (write.kind === 'save-catalog') catalogs.set(write.catalog.id, write.catalog);
      else {
        catalogs.delete(write.id);
        clearedOrigins.push(write.id);
      }
      accept(write.accepted);
      return success();
    },
    list: notUsed,
    get: (id) => Promise.resolve({ kind: 'success', catalog: catalogs.get(id) ?? null } as const),
    save: notUsed,
    remove: notUsed,
    put: (origin) => {
      originRows.set(origin.bookId, origin);
      return success();
    },
    listAll: notUsed,
    listByCatalog: notUsed,
    find: notUsed,
    findByBook: (id) =>
      Promise.resolve({ kind: 'success', origin: originRows.get(id) ?? null } as const),
    deleteByBook: notUsed,
    deleteByCatalog: notUsed,
  };

  const heldStore: HeldChangeStore = {
    list: () => Promise.resolve({ kind: 'success', changes: [...held.values()] } as const),
    put: (change) => {
      held.set(keyOf(change.kind, change.recordId), change);
      return success();
    },
    remove: (kind, recordId) => {
      held.delete(keyOf(kind, recordId));
      return success();
    },
  };

  const triedStore: TriedDownloadStore = {
    list: () => Promise.resolve({ kind: 'success', contentHashes: new Set(tried) } as const),
    add: (hash) => {
      tried.add(hash);
      return success();
    },
  };

  const state: SyncStateStore = {
    read: () =>
      Promise.resolve(
        unavailable ? STORAGE_UNAVAILABLE : ({ kind: 'success', connection } as const),
      ),
    write: (next) => {
      connection = next;
      cursors.push(next.cursor);
      return success();
    },
    clear: success,
  };

  return {
    deps: {
      state,
      held: heldStore,
      tried: triedStore,
      shelf: { repository: shelf, now: () => 99 },
      captures: { captures: captureRepository },
      catalogs: {
        catalogs: catalogRepository,
        forgetPassword: () => Promise.resolve({ kind: 'success' } as const),
      },
      origins: { origins: catalogRepository },
      tags: { tags: { list: notUsed, save: notUsed, remove: notUsed } },
      now: () => 1234,
      downloadPublication: start.download ?? notUsed,
    },
    get books() {
      return books;
    },
    removedBooks,
    captures,
    tags,
    catalogs,
    clearedOrigins,
    originRows,
    markers,
    versions,
    held,
    tried,
    cursors,
    stored: () => connection,
    arrive: (book: Book) => {
      books = [...books, book];
    },
    mark: (marker: ChangeMarker) => markers.set(keyOf(marker.kind, marker.recordId), marker),
    setVersion: (kind: SyncKind, recordId: string, updatedAt: number, deviceId: string) =>
      versions.set(keyOf(kind, recordId), { kind, recordId, updatedAt, deviceId }),
    breakStorage: () => {
      unavailable = true;
    },
  };
}

function serving(...pages: readonly (PullPage | PullResult)[]) {
  const asked: number[] = [];
  const refused = () => Promise.reject(new Error('the server must only be pulled from'));
  const server: SyncServer = {
    info: refused,
    createDevice: refused,
    listDevices: refused,
    revokeDevice: refused,
    push: () => Promise.resolve({ kind: 'success', accepted: [] }),
    pull: (_url, _token, after) => {
      asked.push(after);
      const next = pages[asked.length - 1];
      if (next === undefined) throw new Error('no page left');
      return Promise.resolve('changes' in next ? { kind: 'success', page: next } : next);
    },
  };
  return { server, asked };
}

function page(changes: readonly StoredChange[], next: number, more = false): PullPage {
  return { changes, next, more };
}

function pullFrom(source: ReturnType<typeof world>, ...pages: readonly (PullPage | PullResult)[]) {
  const { server, asked } = serving(...pages);
  return { asked, result: pullChanges({ ...source.deps, server }) };
}

describe('pullChanges merge', () => {
  it('applies an incoming change newer than the held version', async () => {
    const source = world({ tags: [TAG] });
    source.setVersion('tag', TAG_ID, 1, DEVICE);

    const { result } = pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 1, held: 0, skipped: 0 });
    expect(source.tags.get(TAG_ID)).toMatchObject({ name: 'grammar', colour: 'sage' });
  });

  it('ignores an incoming change older than the held version', async () => {
    const source = world({ tags: [TAG] });
    source.setVersion('tag', TAG_ID, 5, DEVICE);

    const { result } = pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 0, held: 0, skipped: 0 });
    expect(source.tags.get(TAG_ID)).toEqual(TAG);
  });

  it('treats this device change coming back as already applied', async () => {
    const source = world({ tags: [TAG] });
    source.setVersion('tag', TAG_ID, 2, DEVICE);

    const { result } = pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2, DEVICE)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 0, held: 0, skipped: 0 });
    expect(source.tags.get(TAG_ID)).toEqual(TAG);
  });

  it('lets an incoming change beat an older pending marker and deletes the marker', async () => {
    const source = world({ tags: [TAG] });
    source.mark(changeMarker('tag', TAG_ID, false, 1));

    await pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 1)).result;

    expect(source.tags.get(TAG_ID)?.name).toBe('grammar');
    expect([...source.markers.values()]).toEqual([]);
    expect(source.versions.get(keyOf('tag', TAG_ID))).toMatchObject({
      updatedAt: 2,
      deviceId: OTHER,
    });
  });

  it('keeps a pending marker newer than the incoming change', async () => {
    const source = world({ tags: [TAG] });
    const marker = changeMarker('tag', TAG_ID, false, 9);
    source.mark(marker);

    const { result } = pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 0, held: 0, skipped: 0 });
    expect(source.tags.get(TAG_ID)).toEqual(TAG);
    expect([...source.markers.values()]).toEqual([marker]);
  });
});

describe('pullChanges apply', () => {
  it('upserts a tag from its data', async () => {
    const source = world({});

    await pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 1)).result;

    expect(source.tags.get(TAG_ID)).toMatchObject({ name: 'grammar' });
  });

  it('deletes a tag and removes it from the captures that carry it', async () => {
    const source = world({ tags: [TAG], books: [BOOK], captures: [CAPTURE] });

    await pullFrom(source, page([incoming('tag', TAG_ID, null, 2)], 1)).result;

    expect(source.tags.has(TAG_ID)).toBe(false);
    expect(source.captures.get(CAPTURE_ID)?.tagIds).toEqual([]);
  });

  it('upserts a catalog from its data', async () => {
    const source = world({ catalogs: [CATALOG] });

    await pullFrom(source, page([incoming('catalog', CATALOG_ID, CATALOG_DATA, 2)], 1)).result;

    expect(source.catalogs.get(CATALOG_ID)?.title).toBe('Home library');
  });

  it('deletes a catalog and clears its origins', async () => {
    const source = world({ catalogs: [CATALOG] });

    await pullFrom(source, page([incoming('catalog', CATALOG_ID, null, 2)], 1)).result;

    expect(source.catalogs.has(CATALOG_ID)).toBe(false);
    expect(source.clearedOrigins).toEqual([CATALOG_ID]);
  });

  it('upserts a capture for a present book under the local book id', async () => {
    const source = world({ books: [BOOK] });

    const { result } = pullFrom(
      source,
      page([incoming('capture', CAPTURE_ID, CAPTURE_DATA, 2)], 1),
    );

    expect(await result).toEqual({ kind: 'success', applied: 1, held: 0, skipped: 0 });
    expect(source.captures.get(CAPTURE_ID)).toMatchObject({ bookId: BOOK.id, text: 'my own note' });
  });

  it('holds a capture for an absent book, then applies it once the book arrives', async () => {
    const source = world({});

    const pulled = await pullFrom(
      source,
      page([incoming('capture', CAPTURE_ID, CAPTURE_DATA, 2)], 1),
    ).result;
    const stillAbsent = await applyHeldChanges({ ...source.deps });
    source.arrive(BOOK);
    const retried = await applyHeldChanges({ ...source.deps });

    expect(pulled).toEqual({ kind: 'success', applied: 0, held: 1, skipped: 0 });
    expect(stillAbsent).toEqual({ kind: 'success', applied: 0, held: 1, skipped: 0 });
    expect(retried).toEqual({ kind: 'success', applied: 1, held: 0, skipped: 0 });
    expect(source.captures.get(CAPTURE_ID)?.bookId).toBe(BOOK.id);
    expect(source.held.size).toBe(0);
  });

  it('deletes a capture on a tombstone and drops its held copy', async () => {
    const source = world({ captures: [CAPTURE] });
    source.held.set(keyOf('capture', CAPTURE_ID), incoming('capture', CAPTURE_ID, CAPTURE_DATA, 1));

    await pullFrom(source, page([incoming('capture', CAPTURE_ID, null, 2)], 1)).result;

    expect(source.captures.has(CAPTURE_ID)).toBe(false);
    expect(source.held.size).toBe(0);
  });

  it('updates the identity fields of the book held under that content hash', async () => {
    const source = world({ books: [BOOK] });

    await pullFrom(source, page([incoming('book', HASH, BOOK_DATA, 2)], 1)).result;

    expect(source.books[0]).toMatchObject({ direction: 'rtl', volume: 1, title: BOOK.title });
  });

  it('moves a book to the removed shelf on a tombstone', async () => {
    const source = world({ books: [BOOK] });

    await pullFrom(source, page([incoming('book', HASH, null, 2)], 1)).result;

    expect(source.books).toEqual([]);
    expect(source.removedBooks).toEqual([HASH]);
  });

  it('holds a book record when no local file carries that hash', async () => {
    const source = world({});

    const { result } = pullFrom(source, page([incoming('book', HASH, BOOK_DATA, 2)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 0, held: 1, skipped: 0 });
    expect([...source.held.keys()]).toEqual([keyOf('book', HASH)]);
  });

  it('applies a position to a present book', async () => {
    const source = world({ books: [BOOK] });

    await pullFrom(source, page([incoming('position', HASH, POSITION_DATA, 2)], 1)).result;

    expect(source.books[0]?.position).toEqual(imagePlace(imageIndex(12), imageIndex(13), 0.4));
  });

  it('holds a position for an absent book', async () => {
    const source = world({});

    const { result } = pullFrom(source, page([incoming('position', HASH, POSITION_DATA, 2)], 1));

    expect(await result).toEqual({ kind: 'success', applied: 0, held: 1, skipped: 0 });
  });

  it('counts unreadable data as skipped, keeps the held version and goes on', async () => {
    const source = world({ tags: [TAG] });
    source.setVersion('tag', TAG_ID, 1, DEVICE);

    const { result } = pullFrom(
      source,
      page(
        [incoming('tag', TAG_ID, { name: 5 }, 2), incoming('catalog', CATALOG_ID, CATALOG_DATA, 2)],
        1,
      ),
    );

    expect(await result).toEqual({ kind: 'success', applied: 1, held: 0, skipped: 1 });
    expect(source.versions.get(keyOf('tag', TAG_ID))).toMatchObject({
      updatedAt: 1,
      deviceId: DEVICE,
    });
  });
});

describe('pullChanges paging', () => {
  it('asks from the stored cursor page after page and saves the cursor after each', async () => {
    const source = world({});

    const { asked, result } = pullFrom(
      source,
      page([incoming('tag', TAG_ID, TAG_DATA, 2)], 10, true),
      page([incoming('catalog', CATALOG_ID, CATALOG_DATA, 3)], 20),
    );

    expect(await result).toEqual({ kind: 'success', applied: 2, held: 0, skipped: 0 });
    expect(asked).toEqual([0, 10]);
    expect(source.cursors).toEqual([10, 20]);
  });

  it('keeps the cursor of page one when page two fails', async () => {
    const source = world({});

    const { result } = pullFrom(source, page([incoming('tag', TAG_ID, TAG_DATA, 2)], 10, true), {
      kind: 'offline',
    });

    expect(await result).toEqual({ kind: 'offline' });
    expect(source.stored().cursor).toBe(10);
  });

  it('reports storage-unavailable without asking the server', async () => {
    const source = world({});
    source.breakStorage();

    const { asked, result } = pullFrom(source);

    expect(await result).toEqual(STORAGE_UNAVAILABLE);
    expect(asked).toEqual([]);
  });
});

const CHOICES = { matching: 'content', defaults: INITIAL_READING_DEFAULTS } as const;

const OTHER_HASH = contentHash('fedcba9876543210fedcba9876543210');

const LOCAL_ORIGIN: BookOrigin = {
  bookId: BOOK.id,
  catalogId: CATALOG_ID,
  entryId: 'urn:uuid:downloaded-here',
  acquisition: { href: '/get/here.cbz', format: 'cbz', mediaType: 'x', length: null },
  updated: '2026-03-01T10:00:00Z',
  feedPath: [],
  feedPosition: 0,
  downloadedAt: 42,
};

function hold(
  source: ReturnType<typeof world>,
  data: ChangeData,
  recordId = HASH,
): Promise<unknown> {
  return pullFrom(source, page([incoming('book', recordId, data, 2)], 1)).result;
}

describe('listRemoteBooks', () => {
  it('names a held book downloadable with its origin, or not on this device without one', async () => {
    const source = world({ catalogs: [CATALOG] });
    await hold(source, BOOK_DATA_WITH_ORIGIN);
    await hold(source, BOOK_DATA, OTHER_HASH);

    const listed = await listRemoteBooks(source.deps);

    expect(listed).toMatchObject({
      kind: 'success',
      books: [
        {
          contentHash: HASH,
          availability: { kind: 'downloadable', origin: { entryId: 'urn:uuid:5d1c' } },
        },
        { contentHash: OTHER_HASH, availability: { kind: 'not-on-this-device' } },
      ],
    });
  });

  it('names a book not on this device when its catalog is not configured here', async () => {
    const source = world({});
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    const listed = await listRemoteBooks(source.deps);

    expect(listed).toMatchObject({
      kind: 'success',
      books: [{ contentHash: HASH, availability: { kind: 'not-on-this-device' } }],
    });
  });

  it('drops a book when its tombstone arrives', async () => {
    const source = world({ catalogs: [CATALOG] });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    await pullFrom(source, page([incoming('book', HASH, null, 3)], 2)).result;

    expect(await listRemoteBooks(source.deps)).toEqual({ kind: 'success', books: [] });
    expect(source.held.size).toBe(0);
  });

  it('records the origin of a book this device already holds', async () => {
    const source = world({ catalogs: [CATALOG] });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    source.arrive(BOOK);
    await applyHeldChanges(source.deps);

    expect(source.originRows.get(BOOK.id)).toMatchObject({
      bookId: BOOK.id,
      catalogId: CATALOG_ID,
      entryId: 'urn:uuid:5d1c',
      feedPosition: 3,
    });
  });

  it('keeps the origin this device recorded when it downloaded the book itself', async () => {
    const source = world({ catalogs: [CATALOG], origins: [LOCAL_ORIGIN] });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    source.arrive(BOOK);
    await applyHeldChanges(source.deps);

    expect(source.originRows.get(BOOK.id)).toEqual(LOCAL_ORIGIN);
  });

  it('drops a book once this device holds the same file and held changes are applied', async () => {
    const source = world({ catalogs: [CATALOG] });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    source.arrive(BOOK);

    expect(await listRemoteBooks(source.deps)).toEqual({ kind: 'success', books: [] });
    await applyHeldChanges(source.deps);
    expect(source.held.size).toBe(0);
  });
});

describe('downloadRemoteBook', () => {
  it('downloads from the stored origin, then attaches the held captures', async () => {
    const asked: string[] = [];
    let source: ReturnType<typeof world> | null = null;
    const download: DownloadPublication = (publication, acquisition, feedPosition) => {
      asked.push(
        `${publication.catalogId} ${publication.entryId} ${acquisition.format} ${acquisition.href} ${feedPosition}`,
      );
      source?.arrive(BOOK);
      return Promise.resolve({ kind: 'success', bookId: BOOK.id });
    };
    source = world({ catalogs: [CATALOG], download });
    await hold(source, BOOK_DATA_WITH_ORIGIN);
    await pullFrom(source, page([incoming('capture', CAPTURE_ID, CAPTURE_DATA, 2)], 2)).result;
    expect(source.captures.size).toBe(0);

    const result = await downloadRemoteBook(source.deps, HASH, CHOICES, () => undefined);

    expect(result).toMatchObject({ kind: 'success', bookId: BOOK.id, applied: 2 });
    expect(asked).toEqual([`${CATALOG_ID} urn:uuid:5d1c cbz /get/5d1c.cbz 3`]);
    expect(source.captures.get(CAPTURE_ID)?.bookId).toBe(BOOK.id);
  });

  it('remembers the remote hash as tried when the downloaded file has another hash', async () => {
    let source: ReturnType<typeof world> | null = null;
    const download: DownloadPublication = () => {
      source?.arrive({ ...BOOK, contentHash: OTHER_HASH });
      return Promise.resolve({ kind: 'success', bookId: BOOK.id });
    };
    source = world({ catalogs: [CATALOG], download });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    const result = await downloadRemoteBook(source.deps, HASH, CHOICES, () => undefined);

    expect(result).toEqual({ kind: 'different-file' });
    expect([...source.tried]).toEqual([HASH]);
  });

  it('asks for the catalog password when the catalog is locked', async () => {
    const source = world({
      catalogs: [CATALOG],
      download: () => Promise.resolve({ kind: 'locked', id: CATALOG_ID }),
    });
    await hold(source, BOOK_DATA_WITH_ORIGIN);

    const result = await downloadRemoteBook(source.deps, HASH, CHOICES, () => undefined);

    expect(result).toEqual({ kind: 'locked', catalogId: CATALOG_ID });
  });
});

describe('syncNow', () => {
  it('pushes, retries held, pulls, retries held and stores the sync time', async () => {
    const source = world({});
    source.mark(changeMarker('tag', TAG_ID, true, 1));
    const order: string[] = [];
    const base = serving(page([incoming('capture', CAPTURE_ID, CAPTURE_DATA, 2)], 1));
    const server: SyncServer = {
      ...base.server,
      push: (...call) => {
        order.push('push');
        return base.server.push(...call);
      },
      pull: (...call) => {
        order.push('pull');
        source.arrive(BOOK);
        return base.server.pull(...call);
      },
    };

    const result = await syncNow({ ...source.deps, server }, CHOICES);

    expect(order).toEqual(['push', 'pull']);
    expect(result).toEqual({
      kind: 'success',
      pushed: 1,
      waiting: 0,
      applied: 1,
      held: 0,
      skipped: 0,
      downloaded: 0,
      downloadFailed: 0,
    });
    expect(source.stored().lastSyncAt).toBe(1234);
  });

  it('downloads nothing while automatic download is off', async () => {
    let downloads = 0;
    const source = world({
      catalogs: [CATALOG],
      download: () => {
        downloads += 1;
        return Promise.reject(new Error('must not download'));
      },
    });
    await hold(source, BOOK_DATA_WITH_ORIGIN);
    const server = serving(page([], 1)).server;

    const result = await syncNow({ ...source.deps, server }, CHOICES);

    expect(downloads).toBe(0);
    expect(result).toMatchObject({ kind: 'success', downloaded: 0, downloadFailed: 0 });
  });

  it('downloads every downloadable book one by one, counts the failures and attaches captures', async () => {
    let source: ReturnType<typeof world> | null = null;
    const order: string[] = [];
    const download: DownloadPublication = (publication) => {
      order.push(publication.entryId);
      if (publication.entryId !== 'urn:uuid:5d1c') return Promise.resolve({ kind: 'offline' });
      source?.arrive(BOOK);
      return Promise.resolve({ kind: 'success', bookId: BOOK.id });
    };
    source = world({ catalogs: [CATALOG], autoDownload: true, download });
    await hold(source, BOOK_DATA_WITH_ORIGIN);
    const second = {
      ...BOOK_DATA_WITH_ORIGIN,
      contentHash: OTHER_HASH,
      origin: { ...(BOOK_DATA_WITH_ORIGIN['origin'] as ChangeData), entryId: 'urn:uuid:other' },
    };
    await hold(source, second, OTHER_HASH);
    await pullFrom(source, page([incoming('capture', CAPTURE_ID, CAPTURE_DATA, 2)], 3)).result;
    const server = serving(page([], 3)).server;

    const result = await syncNow({ ...source.deps, server }, CHOICES);

    expect(order).toEqual(['urn:uuid:5d1c', 'urn:uuid:other']);
    expect(result).toMatchObject({ kind: 'success', downloaded: 1, downloadFailed: 1, held: 1 });
    expect(source.captures.get(CAPTURE_ID)?.bookId).toBe(BOOK.id);
  });

  it('skips a tried record in automatic download and flags it in the list', async () => {
    let downloads = 0;
    const source = world({
      catalogs: [CATALOG],
      autoDownload: true,
      tried: [HASH],
      download: () => {
        downloads += 1;
        return Promise.reject(new Error('must not download'));
      },
    });
    await hold(source, BOOK_DATA_WITH_ORIGIN);
    const server = serving(page([], 1)).server;

    const result = await syncNow({ ...source.deps, server }, CHOICES);

    expect(downloads).toBe(0);
    expect(result).toMatchObject({ kind: 'success', downloaded: 0, downloadFailed: 0 });
    expect(await listRemoteBooks(source.deps)).toMatchObject({
      books: [{ contentHash: HASH, fileDiffers: true }],
    });
  });

  it('stops at a failed push and stores no sync time', async () => {
    const source = world({});
    source.mark(changeMarker('tag', TAG_ID, true, 1));
    const server: SyncServer = {
      ...serving().server,
      push: () => Promise.resolve({ kind: 'offline' }),
    };

    const result = await syncNow({ ...source.deps, server }, CHOICES);

    expect(result).toEqual({ kind: 'offline' });
    expect(source.stored().lastSyncAt).toBeNull();
  });
});
