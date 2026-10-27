import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BLOCKED_PATIENCE_MS,
  deleteByIndex,
  getRecord,
  openDatabase,
  rewriteByIndex,
  settleMarkers,
  writeAfterRead,
  writeRecords,
} from './connection';

type Handler = (() => void) | null;

class FakeRequest {
  result: FakeDatabase | undefined;
  transaction: object | null = null;
  error: DOMException | null = null;
  onupgradeneeded: Handler = null;
  onsuccess: Handler = null;
  onblocked: Handler = null;
  onerror: Handler = null;

  readonly version: number;

  constructor(version: number) {
    this.version = version;
  }

  succeed(db: FakeDatabase): void {
    this.result = db;
    this.onsuccess?.();
  }

  block(): void {
    this.onblocked?.();
  }

  upgrade(db: FakeDatabase, transaction: object): void {
    this.result = db;
    this.transaction = transaction;
    this.onupgradeneeded?.();
  }

  fail(error: DOMException): void {
    this.error = error;
    this.onerror?.();
  }
}

class FakeDatabase {
  closed = false;
  served = 0;
  onversionchange: Handler = null;
  onclose: Handler = null;

  close(): void {
    this.closed = true;
  }

  transaction() {
    this.served += 1;
    const transaction = {
      error: null,
      oncomplete: null as Handler,
      onabort: null as Handler,
      onerror: null as Handler,
      objectStore: () => ({ get: (key: string) => ({ result: `record ${key}` }) }),
    };
    queueMicrotask(() => transaction.oncomplete?.());
    return transaction;
  }
}

class FakeFactory {
  readonly requests: FakeRequest[] = [];
  holding = false;

  open(_name: string, version: number): FakeRequest {
    const request = new FakeRequest(version);
    this.requests.push(request);
    if (!this.holding) queueMicrotask(() => request.succeed(new FakeDatabase()));
    return request;
  }

  last(): FakeRequest {
    const request = this.requests.at(-1);
    if (request === undefined) throw new Error('no open request');
    return request;
  }
}

let factory: FakeFactory;
let databaseCount = 0;

function freshName(): string {
  databaseCount += 1;
  return `database-${databaseCount}`;
}

function upgrade(): void {}

const RETIREMENTS = [
  { cause: 'a version change', version: 2, retire: (db: FakeDatabase) => db.onversionchange?.() },
  { cause: 'the browser closing it', version: 1, retire: (db: FakeDatabase) => db.onclose?.() },
] as const;

async function opened(name: string, version = 1): Promise<FakeDatabase> {
  const db = await openDatabase(name, version, upgrade);
  if (!(db instanceof FakeDatabase)) throw new Error('not a fake database');
  return db;
}

function asConnection(db: FakeDatabase): IDBDatabase {
  return db as unknown as IDBDatabase;
}

beforeEach(() => {
  factory = new FakeFactory();
  vi.stubGlobal('indexedDB', factory);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('openDatabase', () => {
  it('shares one connection per database name', async () => {
    const name = freshName();

    const first = await opened(name);
    const second = await opened(name);

    expect(second).toBe(first);
    expect(factory.requests).toHaveLength(1);
  });

  it('closes the connection when another tab asks for a version change', async () => {
    const db = await opened(freshName());

    db.onversionchange?.();

    expect(db.closed).toBe(true);
  });

  it.each(RETIREMENTS)('opens a new connection after $cause', async ({ version, retire }) => {
    const name = freshName();
    const db = await opened(name, version);

    retire(db);
    const reopened = await opened(name, version);

    expect(reopened).not.toBe(db);
    expect(factory.requests).toHaveLength(2);
    expect(factory.last().version).toBe(version);
  });

  it('hands the upgrade the database and its version change transaction', async () => {
    factory.holding = true;
    const seen: unknown[] = [];
    const opening = openDatabase(freshName(), 2, (db, upgrading) => seen.push(db, upgrading));
    const db = new FakeDatabase();
    const upgrading = { mode: 'versionchange' };

    factory.last().upgrade(db, upgrading);
    factory.last().succeed(db);

    await expect(opening).resolves.toBe(db);
    expect(seen).toEqual([db, upgrading]);
  });

  it('resolves once a blocked upgrade is unblocked', async () => {
    factory.holding = true;
    const opening = openDatabase(freshName(), 2, upgrade);
    const db = new FakeDatabase();

    factory.last().block();
    factory.last().succeed(db);

    await expect(opening).resolves.toBe(db);
  });

  it('rejects a blocked upgrade that no other tab releases in time', async () => {
    vi.useFakeTimers();
    factory.holding = true;
    const opening = openDatabase(freshName(), 2, upgrade);
    const outcome = expect(opening).rejects.toThrow('held open by another tab');

    factory.last().block();
    vi.advanceTimersByTime(BLOCKED_PATIENCE_MS);

    await outcome;
  });

  it('keeps waiting on a blocked upgrade before the patience runs out', async () => {
    vi.useFakeTimers();
    factory.holding = true;
    const opening = openDatabase(freshName(), 2, upgrade);
    const db = new FakeDatabase();

    factory.last().block();
    vi.advanceTimersByTime(BLOCKED_PATIENCE_MS - 1);
    factory.last().succeed(db);

    await expect(opening).resolves.toBe(db);
  });

  it('closes a connection that arrives after it gave up waiting', async () => {
    vi.useFakeTimers();
    factory.holding = true;
    const opening = openDatabase(freshName(), 2, upgrade);
    const outcome = expect(opening).rejects.toThrow();
    const late = new FakeDatabase();

    factory.last().block();
    vi.advanceTimersByTime(BLOCKED_PATIENCE_MS);
    await outcome;
    factory.last().succeed(late);

    expect(late.closed).toBe(true);
  });

  it('asks for a reload when a newer tab has upgraded past its version', async () => {
    factory.holding = true;
    const opening = openDatabase(freshName(), 1, upgrade);

    factory.last().fail(new DOMException('newer version exists', 'VersionError'));

    await expect(opening).rejects.toThrow('Reload this page');
  });

  it('keeps the refusal of a failed open as its cause', async () => {
    factory.holding = true;
    const failing = openDatabase(freshName(), 1, upgrade);
    const refusal = new DOMException('broken', 'UnknownError');
    factory.last().fail(refusal);

    await expect(failing).rejects.toHaveProperty('cause', refusal);
  });

  it('opens again after a failed open', async () => {
    const name = freshName();
    factory.holding = true;
    const failing = openDatabase(name, 1, upgrade);
    factory.last().fail(new DOMException('broken', 'UnknownError'));
    await expect(failing).rejects.toThrow('failed to open');

    factory.holding = false;
    await opened(name);

    expect(factory.requests).toHaveLength(2);
  });
});

describe('getRecord', () => {
  it('reads through the connection it is given while that connection is open', async () => {
    const db = await opened(freshName());

    const record = await getRecord(asConnection(db), 'books', 'a');

    expect(record).toBe('record a');
    expect(db.served).toBe(1);
  });

  it.each(RETIREMENTS)(
    'reads through a reopened connection when handed one closed by $cause',
    async ({ version, retire }) => {
      const name = freshName();
      const stale = await opened(name, version);
      retire(stale);

      const record = await getRecord(asConnection(stale), 'books', 'a');
      const reopened = await opened(name, version);

      expect(record).toBe('record a');
      expect(stale.served).toBe(0);
      expect(reopened.served).toBe(1);
      expect(factory.last().version).toBe(version);
    },
  );
});

type Placed = { readonly store: string; readonly kind: 'put' | 'delete'; readonly value: unknown };

class RecordingTransaction {
  readonly placed: Placed[] = [];
  aborted = false;
  error: DOMException | null = null;
  oncomplete: Handler = null;
  onabort: Handler = null;
  onerror: Handler = null;

  readonly #stores: readonly string[];
  readonly #rows: ReadonlyMap<string, unknown>;

  constructor(stores: readonly string[], rows: ReadonlyMap<string, unknown>) {
    this.#stores = stores;
    this.#rows = rows;
    setTimeout(() => {
      if (!this.aborted) this.oncomplete?.();
    });
  }

  objectStore(store: string) {
    if (!this.#stores.includes(store)) throw new DOMException(store, 'NotFoundError');
    return {
      get: (key: string) => {
        const request = { result: this.#rows.get(`${store}/${key}`), onsuccess: null as Handler };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
      put: (value: unknown) => {
        if (typeof value === 'function') throw new DOMException('function', 'DataCloneError');
        this.placed.push({ store, kind: 'put', value });
      },
      delete: (value: unknown) => this.placed.push({ store, kind: 'delete', value }),
      index: () => ({
        getAllKeys: (key: string) => this.#indexRequest(`${store}/by/${key}/keys`),
        getAll: (key: string) => this.#indexRequest(`${store}/by/${key}/rows`),
      }),
    };
  }

  #indexRequest(row: string) {
    const request = { result: this.#rows.get(row), onsuccess: null as Handler };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  }

  abort(): void {
    this.aborted = true;
    queueMicrotask(() => this.onabort?.());
  }
}

class RecordingDatabase {
  readonly opened: { readonly stores: readonly string[]; readonly mode: string }[] = [];
  readonly transactions: RecordingTransaction[] = [];
  readonly rows = new Map<string, unknown>();

  transaction(stores: readonly string[], mode: string): RecordingTransaction {
    this.opened.push({ stores, mode });
    const transaction = new RecordingTransaction(stores, this.rows);
    this.transactions.push(transaction);
    return transaction;
  }
}

function recordingConnection(db: RecordingDatabase): IDBDatabase {
  return db as unknown as IDBDatabase;
}

describe('writeRecords', () => {
  it('places every write in one readwrite transaction across the stores they name', async () => {
    const db = new RecordingDatabase();

    await writeRecords(recordingConnection(db), [
      { kind: 'delete', store: 'books', key: 'a' },
      { kind: 'delete', store: 'page-lists', key: 'a' },
      { kind: 'put', store: 'books', record: { id: 'b' } },
    ]);

    expect(db.opened).toEqual([{ stores: ['books', 'page-lists'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed).toEqual([
      { store: 'books', kind: 'delete', value: 'a' },
      { store: 'page-lists', kind: 'delete', value: 'a' },
      { store: 'books', kind: 'put', value: { id: 'b' } },
    ]);
  });

  it('aborts the transaction, so no placed write commits, when a later write cannot be placed', async () => {
    const db = new RecordingDatabase();

    const writing = writeRecords(recordingConnection(db), [
      { kind: 'delete', store: 'books', key: 'a' },
      { kind: 'put', store: 'books', record: () => undefined },
    ]);

    await expect(writing).rejects.toThrow('are not usable');
    expect(db.transactions[0]?.placed).toHaveLength(1);
    expect(db.transactions[0]?.aborted).toBe(true);
  });
});

function MARKER_OF(recordId: string) {
  return { kind: 'tag', recordId, deleted: false, at: 1, changeId: 'c' } as const;
}

describe('change markers', () => {
  const MARKER = { kind: 'tag', recordId: 't', deleted: false, at: 1, changeId: 'c1' } as const;

  it('announces a local change once a marked write commits, and announces nothing for an unmarked write', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        postMessage(message: unknown): void {
          posts.push(message);
        }
        close(): void {}
      },
    );
    const db = new RecordingDatabase();

    await writeRecords(recordingConnection(db), [
      { kind: 'put', store: 'tags', record: { id: 't' } },
    ]);
    expect(posts).toEqual([]);

    await writeRecords(recordingConnection(db), [
      { kind: 'put', store: 'tags', record: { id: 't' } },
      { kind: 'mark', marker: MARKER },
    ]);
    expect(posts).toHaveLength(1);
  });

  it('places a marker write in the outbox store of the same transaction as the record', async () => {
    const db = new RecordingDatabase();

    await writeRecords(recordingConnection(db), [
      { kind: 'put', store: 'tags', record: { id: 't' } },
      { kind: 'mark', marker: MARKER },
    ]);

    expect(db.opened).toEqual([{ stores: ['tags', 'outbox'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed).toEqual([
      { store: 'tags', kind: 'put', value: { id: 't' } },
      { store: 'outbox', kind: 'put', value: MARKER },
    ]);
  });

  it('marks each record a delete by index removes in the same transaction', async () => {
    const db = new RecordingDatabase();
    db.rows.set('captures/by/b/keys', ['c1', 'c2']);

    await deleteByIndex(recordingConnection(db), 'captures', 'bookId', 'b', (primary) => ({
      ...MARKER,
      kind: 'capture',
      recordId: String(primary),
      deleted: true,
    }));

    expect(db.opened).toEqual([{ stores: ['captures', 'outbox'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed.map((placed) => [placed.store, placed.kind])).toEqual([
      ['captures', 'delete'],
      ['outbox', 'put'],
      ['captures', 'delete'],
      ['outbox', 'put'],
    ]);
  });

  it('marks each record a rewrite by index puts back in the same transaction', async () => {
    const db = new RecordingDatabase();
    db.rows.set('captures/by/b/rows', [{ id: 'c1' }, { id: 'c2' }]);

    await rewriteByIndex<{ id: string }>(
      recordingConnection(db),
      'captures',
      'bookId',
      'b',
      (row) => ({ id: `${row.id}!` }),
      (_before, after) => ({ ...MARKER, kind: 'capture', recordId: after.id }),
    );

    expect(db.opened).toEqual([{ stores: ['captures', 'outbox'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed.map((placed) => [placed.store, placed.kind])).toEqual([
      ['captures', 'put'],
      ['outbox', 'put'],
      ['captures', 'put'],
      ['outbox', 'put'],
    ]);
  });
});

describe('settleMarkers', () => {
  it('deletes only the outbox entries that still hold the settled change id and puts every held version', async () => {
    const db = new RecordingDatabase();
    db.rows.set('outbox/tag,a', { ...MARKER_OF('a'), changeId: 'sent' });
    db.rows.set('outbox/tag,b', { ...MARKER_OF('b'), changeId: 'newer' });
    const version = { updatedAt: 4, deviceId: 'device' };

    await settleMarkers(recordingConnection(db), [
      { marker: { ...MARKER_OF('a'), changeId: 'sent' }, version },
      { marker: { ...MARKER_OF('b'), changeId: 'sent' }, version },
    ]);

    expect(db.opened).toEqual([{ stores: ['outbox', 'record-versions'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed).toEqual([
      { store: 'outbox', kind: 'delete', value: ['tag', 'a'] },
      {
        store: 'record-versions',
        kind: 'put',
        value: { kind: 'tag', recordId: 'a', updatedAt: 4, deviceId: 'device' },
      },
      {
        store: 'record-versions',
        kind: 'put',
        value: { kind: 'tag', recordId: 'b', updatedAt: 4, deviceId: 'device' },
      },
    ]);
  });

  it('keeps a later held version and replaces an older one', async () => {
    const db = new RecordingDatabase();
    db.rows.set('record-versions/tag,later', { updatedAt: 200, deviceId: 'B' });
    db.rows.set('record-versions/tag,older', { updatedAt: 50, deviceId: 'B' });
    const version = { updatedAt: 100, deviceId: 'A' };

    await settleMarkers(recordingConnection(db), [
      { marker: MARKER_OF('later'), version },
      { marker: MARKER_OF('older'), version },
    ]);

    expect(
      db.transactions[0]?.placed.filter((placed) => placed.store === 'record-versions'),
    ).toEqual([
      {
        store: 'record-versions',
        kind: 'put',
        value: { kind: 'tag', recordId: 'older', updatedAt: 100, deviceId: 'A' },
      },
    ]);
  });
});

describe('writeAfterRead', () => {
  it('places the writes decided from the record it read inside the same transaction', async () => {
    const db = new RecordingDatabase();
    db.rows.set('books/a', { id: 'a', title: 'Kept' });
    const seen: unknown[] = [];

    await writeAfterRead<{ id: string; title: string }>(
      recordingConnection(db),
      ['books', 'removed-books'],
      { store: 'books', key: 'a' },
      (found) => {
        seen.push(found);
        return [
          { kind: 'put', store: 'removed-books', record: { ...found, removedAt: 1 } },
          { kind: 'delete', store: 'books', key: 'a' },
        ];
      },
    );

    expect(seen).toEqual([{ id: 'a', title: 'Kept' }]);
    expect(db.opened).toEqual([{ stores: ['books', 'removed-books'], mode: 'readwrite' }]);
    expect(db.transactions[0]?.placed).toEqual([
      { store: 'removed-books', kind: 'put', value: { id: 'a', title: 'Kept', removedAt: 1 } },
      { store: 'books', kind: 'delete', value: 'a' },
    ]);
  });
});
