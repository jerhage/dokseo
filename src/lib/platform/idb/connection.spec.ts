import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCKED_PATIENCE_MS, getRecord, openDatabase } from './connection';

type Handler = (() => void) | null;

class FakeRequest {
  result: FakeDatabase | undefined;
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
