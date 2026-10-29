import { describe, expect, it } from 'vitest';
import type { BookOrigin } from '$lib/domains/catalog/domain/book-origin';
import type { Catalog } from '$lib/domains/catalog/domain/catalog';
import type { CatalogRepository } from '$lib/domains/catalog/domain/catalog-repository';
import type { OriginRepository } from '$lib/domains/catalog/domain/origin-repository';
import type { Book } from '$lib/domains/library/domain/book/book';
import type { LibraryRepository } from '$lib/domains/library/domain/book/library-repository';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import type { CaptureRepository } from '$lib/domains/recognition/domain/capture/capture-repository';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import type { TagRepository } from '$lib/domains/recognition/domain/tag/tag-repository';
import { regionAnchor } from '$lib/shared/anchor';
import { changeMarker } from '$lib/shared/change-marker';
import type { ChangeKind, ChangeMarker, SettledMarker } from '$lib/shared/change-marker';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, catalogId, contentHash, imageIndex, tagId } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Change } from '../domain/change';
import type { PushResult, SyncServer } from '../domain/sync-server';
import type { SyncConnection, SyncStateStore } from '../domain/sync-state';
import { toSyncBookData } from './book-data';
import { toSyncCaptureData } from './capture-data';
import { toSyncCatalogData } from './catalog-data';
import { toSyncPositionData } from './position-data';
import { pushChanges } from './push-changes';
import { toSyncTagData } from './tag-data';

const CONNECTION: SyncConnection = {
  serverUrl: 'https://sync.example/sync/',
  deviceId: '00000000-0000-4000-8000-000000000002',
  deviceName: 'Phone',
  token: 'dsk_3f9a1c7e5b2d4a60',
  cursor: 0,
  lastSyncAt: null,
  autoDownload: false,
};

const HASH = contentHash('0123456789abcdef0123456789abcdef');

const BOOK: Book = {
  id: bookId('local-book'),
  title: 'Yotsuba&!',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
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

const ORIGIN: BookOrigin = {
  bookId: BOOK.id,
  catalogId: catalogId('00000000-0000-4000-8000-000000000009'),
  entryId: 'urn:book:1',
  acquisition: {
    href: 'https://books.example.net/book/1.cbz',
    format: 'cbz',
    mediaType: 'application/vnd.comicbook+zip',
    length: 1000,
  },
  updated: '2026-01-01T00:00:00Z',
  feedPath: [],
  feedPosition: 0,
  downloadedAt: 2,
};

const CAPTURE: Capture = {
  id: captureId('00000000-0000-4000-8000-000000000001'),
  bookId: BOOK.id,
  anchor: regionAnchor([{ index: imageIndex(4), rect: pageRect(0.1, 0.2, 0.3, 0.25) }]),
  text: 'よつば',
  origin: 'written',
  createdAt: 10,
  editedAt: null,
  tagIds: [],
};

const TAG: Tag = {
  id: tagId('00000000-0000-4000-8000-000000000005'),
  name: 'grammar',
  colour: 'sage',
  createdAt: 3,
};

const CATALOG: Catalog = {
  id: ORIGIN.catalogId,
  title: 'Home library',
  protocol: 'opds1',
  rootUrl: 'https://books.example.net/opds',
  auth: { kind: 'basic', username: 'reader' },
};

type Database = 'shelf' | 'recognition' | 'catalogs';

type HeldVersion = {
  readonly database: Database;
  readonly kind: ChangeKind;
  readonly recordId: string;
  readonly updatedAt: number;
  readonly deviceId: string;
};

function databaseOf(kind: ChangeKind): Database {
  if (kind === 'book' || kind === 'position') return 'shelf';
  if (kind === 'capture' || kind === 'tag') return 'recognition';
  return 'catalogs';
}

function notUsed(): Promise<never> {
  return Promise.reject(new Error('not used'));
}

function world(held: {
  books?: readonly Book[];
  origins?: readonly BookOrigin[];
  captures?: readonly Capture[];
  tags?: readonly Tag[];
  catalogs?: readonly Catalog[];
}) {
  const outbox: Record<Database, Map<string, ChangeMarker>> = {
    shelf: new Map(),
    recognition: new Map(),
    catalogs: new Map(),
  };
  const versions: HeldVersion[] = [];
  let unavailable = false;

  const write = (marker: ChangeMarker): void => {
    outbox[databaseOf(marker.kind)].set(`${marker.kind}:${marker.recordId}`, marker);
  };

  const pending = (database: Database) => () =>
    Promise.resolve(
      unavailable
        ? STORAGE_UNAVAILABLE
        : ({ kind: 'success', markers: [...outbox[database].values()] } as const),
    );

  const settle = (database: Database) => (settled: readonly SettledMarker[]) => {
    for (const { marker, version } of settled) {
      const key = `${marker.kind}:${marker.recordId}`;
      if (outbox[database].get(key)?.changeId === marker.changeId) outbox[database].delete(key);
      versions.push({
        database,
        kind: marker.kind,
        recordId: marker.recordId,
        updatedAt: version.updatedAt,
        deviceId: version.deviceId,
      });
    }
    return Promise.resolve({ kind: 'success' } as const);
  };

  const shelf: LibraryRepository = {
    list: () =>
      Promise.resolve({ kind: 'success', books: held.books ?? [], unreadable: [] } as const),
    pendingChanges: pending('shelf'),
    settleChanges: settle('shelf'),
    recordVersions: () => Promise.resolve({ kind: 'success', versions: [] }),
    applyRemote: () => Promise.resolve({ kind: 'not-found' }),
    acceptRemoteVersion: () => Promise.resolve({ kind: 'success' }),
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

  const captures: CaptureRepository = {
    listEverything: () =>
      Promise.resolve({
        kind: 'success',
        captures: held.captures ?? [],
        unreadable: [],
      } as const),
    pendingChanges: pending('recognition'),
    settleChanges: settle('recognition'),
    recordVersions: () => Promise.resolve({ kind: 'success', versions: [] }),
    applyRemote: () => Promise.resolve({ kind: 'success' }),
    listForBook: notUsed,
    save: notUsed,
    remove: notUsed,
    clearBook: notUsed,
    moveBook: notUsed,
    untagEverywhere: notUsed,
  };

  const tags: TagRepository = {
    list: () =>
      Promise.resolve({ kind: 'success', tags: held.tags ?? [], unreadable: [] } as const),
    save: notUsed,
    remove: notUsed,
  };

  const catalogs: CatalogRepository & OriginRepository = {
    list: () =>
      Promise.resolve({
        kind: 'success',
        catalogs: held.catalogs ?? [],
        unreadable: [],
      } as const),
    pendingChanges: pending('catalogs'),
    settleChanges: settle('catalogs'),
    recordVersions: () => Promise.resolve({ kind: 'success', versions: [] }),
    applyRemote: () => Promise.resolve({ kind: 'success' }),
    get: notUsed,
    save: notUsed,
    remove: notUsed,
    listAll: () =>
      Promise.resolve({
        kind: 'success',
        origins: held.origins ?? [],
        unreadable: [],
      } as const),
    put: notUsed,
    listByCatalog: notUsed,
    find: notUsed,
    findByBook: notUsed,
    deleteByBook: notUsed,
    deleteByCatalog: notUsed,
  };

  return {
    shelf,
    captures,
    tags,
    catalogs,
    outbox,
    versions,
    write,
    breakStorage: () => {
      unavailable = true;
    },
    remaining: () => Object.values(outbox).flatMap((markers) => Array.from(markers.values())),
  };
}

function stateHolding(connection: SyncConnection | null): SyncStateStore {
  return {
    read: () => Promise.resolve({ kind: 'success', connection }),
    write: () => Promise.resolve({ kind: 'success' }),
    clear: () => Promise.resolve({ kind: 'success' }),
  };
}

type Respond = (changes: readonly Change[], call: number) => PushResult;

function accepting(changes: readonly Change[]): PushResult {
  return {
    kind: 'success',
    accepted: changes.map((change, position) => ({ id: change.id, seq: position + 1 })),
  };
}

function serverRecording(respond: Respond = accepting) {
  const batches: (readonly Change[])[] = [];
  const refused = () => Promise.reject(new Error('the server must only be pushed to'));
  const server: SyncServer = {
    info: refused,
    createDevice: refused,
    listDevices: refused,
    revokeDevice: refused,
    pull: refused,
    push: (_url, _token, changes) => {
      batches.push(changes);
      return Promise.resolve(respond(changes, batches.length));
    },
  };
  return { server, batches };
}

function pushFrom(
  source: ReturnType<typeof world>,
  server: SyncServer,
  connection: SyncConnection | null = CONNECTION,
) {
  return pushChanges({
    server,
    state: stateHolding(connection),
    shelf: { repository: source.shelf },
    origins: { origins: source.catalogs },
    captures: { captures: source.captures },
    tags: { tags: source.tags },
    catalogs: { catalogs: source.catalogs },
  });
}

function manyTags(count: number, name = 'tag'): readonly Tag[] {
  return Array.from({ length: count }, (_, position) => ({
    id: tagId(`tag-${position}`),
    name,
    colour: TAG.colour,
    createdAt: TAG.createdAt,
  }));
}

describe('pushChanges', () => {
  it('sends each kind of marker as the change its record maps to', async () => {
    const source = world({
      books: [BOOK],
      origins: [ORIGIN],
      captures: [CAPTURE],
      tags: [TAG],
      catalogs: [CATALOG],
    });
    const markers = [
      changeMarker('book', HASH, false, 1),
      changeMarker('position', HASH, false, 2),
      changeMarker('capture', CAPTURE.id, false, 3),
      changeMarker('tag', TAG.id, false, 4),
      changeMarker('catalog', CATALOG.id, false, 5),
    ];
    markers.forEach(source.write);
    const { server, batches } = serverRecording();

    const result = await pushFrom(source, server);

    expect(result).toEqual({ kind: 'success', pushed: 5, waiting: 0 });
    expect(batches[0]?.map(({ kind, recordId, data }) => ({ kind, recordId, data }))).toEqual([
      { kind: 'book', recordId: HASH, data: toSyncBookData(BOOK, ORIGIN) },
      { kind: 'position', recordId: HASH, data: toSyncPositionData(BOOK) },
      { kind: 'capture', recordId: CAPTURE.id, data: toSyncCaptureData(CAPTURE, HASH) },
      { kind: 'tag', recordId: TAG.id, data: toSyncTagData(TAG) },
      { kind: 'catalog', recordId: CATALOG.id, data: toSyncCatalogData(CATALOG) },
    ]);
  });

  it('sends the marker change id, its time and this device as the change identity', async () => {
    const source = world({ tags: [TAG] });
    const marker = changeMarker('tag', TAG.id, false, 77);
    source.write(marker);
    const { server, batches } = serverRecording();

    await pushFrom(source, server);

    expect(batches[0]?.[0]).toMatchObject({
      id: marker.changeId,
      updatedAt: 77,
      deviceId: CONNECTION.deviceId,
    });
  });

  it('sends a deleted marker as a tombstone even when a record of that id is held', async () => {
    const source = world({ tags: [TAG] });
    source.write(changeMarker('tag', TAG.id, true, 1));
    const { server, batches } = serverRecording();

    await pushFrom(source, server);

    expect(batches[0]?.[0]).toMatchObject({ kind: 'tag', recordId: TAG.id, data: null });
  });

  it('sends a tombstone for a marker whose record is gone', async () => {
    const source = world({});
    source.write(changeMarker('catalog', CATALOG.id, false, 1));
    const { server, batches } = serverRecording();

    await pushFrom(source, server);

    expect(batches[0]?.[0]).toMatchObject({ kind: 'catalog', recordId: CATALOG.id, data: null });
  });

  it('splits more than 500 changes into batches of at most 500, one after the other', async () => {
    const tags = manyTags(501);
    const source = world({ tags });
    tags.forEach((tag, position) => source.write(changeMarker('tag', tag.id, false, position + 1)));
    const { server, batches } = serverRecording();

    const result = await pushFrom(source, server);

    expect(batches.map((batch) => batch.length)).toEqual([500, 1]);
    expect(result).toEqual({ kind: 'success', pushed: 501, waiting: 0 });
    expect(source.remaining()).toEqual([]);
  });

  it('splits changes that together pass 900 KiB into batches under it', async () => {
    const tags = manyTags(3, 'x'.repeat(400 * 1024));
    const source = world({ tags });
    tags.forEach((tag, position) => source.write(changeMarker('tag', tag.id, false, position + 1)));
    const { server, batches } = serverRecording();

    await pushFrom(source, server);

    expect(batches.map((batch) => batch.length)).toEqual([2, 1]);
  });

  it('removes only the markers whose change id is still the one sent and holds the sent version', async () => {
    const tags = manyTags(2);
    const source = world({ tags });
    const [first, second] = tags.map((tag, position) =>
      changeMarker('tag', tag.id, false, position + 1),
    );
    if (first === undefined || second === undefined) throw new Error('two tags');
    source.write(first);
    source.write(second);
    const newer = changeMarker('tag', second.recordId, false, 9);
    const { server } = serverRecording((changes) => {
      source.write(newer);
      return accepting(changes);
    });

    await pushFrom(source, server);

    expect(source.remaining()).toEqual([newer]);
    expect(source.versions).toEqual([
      {
        database: 'recognition',
        kind: 'tag',
        recordId: first.recordId,
        updatedAt: 1,
        deviceId: CONNECTION.deviceId,
      },
      {
        database: 'recognition',
        kind: 'tag',
        recordId: second.recordId,
        updatedAt: 2,
        deviceId: CONNECTION.deviceId,
      },
    ]);
  });

  it('stops at a rejected batch, names its record and leaves that batch unsettled', async () => {
    const tags = manyTags(501);
    const source = world({ tags });
    tags.forEach((tag, position) => source.write(changeMarker('tag', tag.id, false, position + 1)));
    const { server, batches } = serverRecording((changes, call) =>
      call === 1 ? accepting(changes) : { kind: 'rejected', code: 'invalid-change', index: 0 },
    );

    const result = await pushFrom(source, server);

    expect(result).toEqual({
      kind: 'rejected',
      code: 'invalid-change',
      record: { kind: 'tag', recordId: 'tag-500' },
    });
    expect(batches).toHaveLength(2);
    expect(source.remaining().map((marker) => marker.recordId)).toEqual(['tag-500']);
    expect(source.versions).toHaveLength(500);
  });

  it('keeps a capture whose book is missing, counts it as waiting and sends nothing for it', async () => {
    const source = world({ captures: [CAPTURE] });
    const marker = changeMarker('capture', CAPTURE.id, false, 1);
    source.write(marker);
    const { server, batches } = serverRecording();

    const result = await pushFrom(source, server);

    expect(result).toEqual({ kind: 'success', pushed: 0, waiting: 1 });
    expect(batches).toEqual([]);
    expect(source.remaining()).toEqual([marker]);
  });

  it('reports not-connected without reading any marker', async () => {
    const source = world({});
    source.breakStorage();
    const { server, batches } = serverRecording();

    const result = await pushFrom(source, server, null);

    expect(result).toEqual({ kind: 'not-connected' });
    expect(batches).toEqual([]);
  });

  it('reports storage-unavailable when the markers cannot be read', async () => {
    const source = world({});
    source.breakStorage();
    const { server } = serverRecording();

    const result = await pushFrom(source, server);

    expect(result).toEqual(STORAGE_UNAVAILABLE);
  });

  it('reports offline and keeps every marker when the server cannot be reached', async () => {
    const source = world({ tags: [TAG] });
    source.write(changeMarker('tag', TAG.id, false, 1));
    const { server } = serverRecording(() => ({ kind: 'offline' }));

    const result = await pushFrom(source, server);

    expect(result).toEqual({ kind: 'offline' });
    expect(source.remaining()).toHaveLength(1);
    expect(source.versions).toEqual([]);
  });
});
