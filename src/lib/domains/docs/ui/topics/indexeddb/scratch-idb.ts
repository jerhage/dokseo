import { match } from 'ts-pattern';
import { openDatabase, rewriteByIndex } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import { fieldKey, keyText, valueRows } from '../../../domain/indexeddb-format';
import type { QueryResult, QueryRow } from '../../../domain/indexeddb-format';
import {
  DUPLICATE_ATTEMPT,
  SAMPLE_BOOKS,
  SAMPLE_CAPTURES,
} from '../../../domain/indexeddb-samples';
import type { QueryPresetKey } from '../../../domain/indexeddb-samples';
import type { JoinBook, JoinCapture, JoinReader, JoinSeed } from '../../../domain/indexeddb-joins';

const SCRATCH_NAME = 'dokseo-docs-indexeddb';

const SCRATCH_VERSION = 1;

const BOOKS = 'books';

const CAPTURES = 'captures';

const NOTES = 'notes';

const JOIN_BOOKS = 'join-books';

const JOIN_CAPTURES = 'join-captures';

type ScratchCounts = { readonly books: number; readonly captures: number };

function upgradeScratch(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(BOOKS)) {
    const books = db.createObjectStore(BOOKS, { keyPath: 'id' });
    books.createIndex('hash', 'hash', { unique: true });
  }
  if (!db.objectStoreNames.contains(CAPTURES)) {
    const captures = db.createObjectStore(CAPTURES, { keyPath: 'id', autoIncrement: true });
    captures.createIndex('bookId', 'bookId');
    captures.createIndex('createdAt', 'createdAt');
    captures.createIndex('bookId-createdAt', ['bookId', 'createdAt']);
    captures.createIndex('tagIds', 'tagIds', { multiEntry: true });
  }
  if (!db.objectStoreNames.contains(NOTES)) {
    db.createObjectStore(NOTES, { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(JOIN_BOOKS)) {
    db.createObjectStore(JOIN_BOOKS, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(JOIN_CAPTURES)) {
    const captures = db.createObjectStore(JOIN_CAPTURES, { keyPath: 'id' });
    captures.createIndex('bookId', 'bookId');
  }
}

function scratchDatabase(): Promise<IDBDatabase> {
  return openDatabase(SCRATCH_NAME, SCRATCH_VERSION, upgradeScratch);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
}

function finished(transaction: IDBTransaction): Promise<'complete' | 'abort'> {
  return new Promise((resolve) => {
    transaction.addEventListener('complete', () => resolve('complete'));
    transaction.addEventListener('abort', () => resolve('abort'));
  });
}

async function scratchExists(): Promise<boolean | null> {
  if (typeof indexedDB.databases !== 'function') return null;
  const listed = await indexedDB.databases();
  return listed.some((info) => info.name === SCRATCH_NAME);
}

async function scratchCounts(): Promise<ScratchCounts> {
  const db = await scratchDatabase();
  const transaction = db.transaction([BOOKS, CAPTURES], 'readonly');
  const [books, captures] = await Promise.all([
    requestResult(transaction.objectStore(BOOKS).count()),
    requestResult(transaction.objectStore(CAPTURES).count()),
  ]);
  return { books, captures };
}

async function fillSamples(): Promise<void> {
  const db = await scratchDatabase();
  const transaction = db.transaction([BOOKS, CAPTURES], 'readwrite');
  const books = transaction.objectStore(BOOKS);
  const captures = transaction.objectStore(CAPTURES);
  books.clear();
  captures.clear();
  for (const book of SAMPLE_BOOKS) books.add(book);
  for (const capture of SAMPLE_CAPTURES) captures.add(capture);
  const outcome = await finished(transaction);
  if (outcome === 'abort') throw new Error(describeCause(transaction.error));
}

function walkCursor<C extends IDBCursor>(
  request: IDBRequest<C | null>,
): Promise<readonly QueryRow[]> {
  const rows: QueryRow[] = [];
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      const cursor = request.result;
      if (cursor === null) {
        resolve(rows);
        return;
      }
      rows.push({
        step: rows.length + 1,
        key: keyText(cursor.key),
        primaryKey: keyText(cursor.primaryKey),
        value: 'value' in cursor ? captureValue(cursor.value) : null,
      });
      cursor.continue();
    });
    request.addEventListener('error', () => reject(request.error));
  });
}

function captureValue(value: unknown): string {
  return valueRows([value])[0]?.value ?? '';
}

async function runPreset(key: QueryPresetKey): Promise<QueryResult> {
  const db = await scratchDatabase();
  const captures = db.transaction(CAPTURES, 'readonly').objectStore(CAPTURES);
  const rows = (
    request: IDBRequest<unknown[]>,
    keyOf?: (value: unknown) => string,
  ): Promise<QueryResult> =>
    requestResult(request).then((values) => ({ kind: 'rows', rows: valueRows(values, keyOf) }));
  const walked = <C extends IDBCursor>(request: IDBRequest<C | null>) =>
    walkCursor(request).then((found): QueryResult => ({ kind: 'rows', rows: found }));
  return match(key)
    .with('store-all', () => rows(captures.getAll()))
    .with('store-range', () => rows(captures.getAll(IDBKeyRange.bound(3, 7), 3)))
    .with('index-key', () => rows(captures.index('bookId').getAll('b2'), fieldKey('bookId')))
    .with('compound-range', () =>
      rows(
        captures.index('bookId-createdAt').getAll(IDBKeyRange.bound(['b2'], ['b2', []])),
        fieldKey('bookId', 'createdAt'),
      ),
    )
    .with('multi-entry', () =>
      rows(captures.index('tagIds').getAll('vocab'), () => keyText('vocab')),
    )
    .with('cursor-prev', () => walked(captures.index('createdAt').openCursor(null, 'prev')))
    .with('distinct', () => walked(captures.index('bookId').openKeyCursor(null, 'nextunique')))
    .with('count', () =>
      requestResult(captures.index('bookId').count('b1')).then((count): QueryResult => ({
        kind: 'count',
        count,
      })),
    )
    .exhaustive();
}

async function addWithClash(note: (line: string) => void): Promise<number> {
  const db = await scratchDatabase();
  const transaction = db.transaction(BOOKS, 'readwrite');
  const books = transaction.objectStore(BOOKS);
  const fresh = books.add(DUPLICATE_ATTEMPT.fresh);
  fresh.addEventListener('success', () => note(`add ${DUPLICATE_ATTEMPT.fresh.id}: success`));
  const clash = books.add(DUPLICATE_ATTEMPT.clash);
  clash.addEventListener('error', () =>
    note(`add ${DUPLICATE_ATTEMPT.clash.id}: error ${clash.error?.name ?? 'unknown'}`),
  );
  const outcome = await finished(transaction);
  note(
    `transaction: ${outcome}${transaction.error === null ? '' : ` (${transaction.error.name})`}`,
  );
  const counts = await scratchCounts();
  return counts.books;
}

async function moveBook(from: string, to: string): Promise<number> {
  const db = await scratchDatabase();
  await rewriteByIndex<Record<string, unknown>>(db, CAPTURES, 'bookId', from, (row) => ({
    ...row,
    bookId: to,
  }));
  const moved = await requestResult(
    db.transaction(CAPTURES, 'readonly').objectStore(CAPTURES).index('bookId').count(to),
  );
  return moved;
}

async function seedJoin(seed: JoinSeed): Promise<void> {
  const db = await scratchDatabase();
  const transaction = db.transaction([JOIN_BOOKS, JOIN_CAPTURES], 'readwrite');
  const books = transaction.objectStore(JOIN_BOOKS);
  const captures = transaction.objectStore(JOIN_CAPTURES);
  books.clear();
  captures.clear();
  for (const book of seed.books) books.put(book);
  for (const capture of seed.captures) captures.put(capture);
  const outcome = await finished(transaction);
  if (outcome === 'abort') throw new Error(describeCause(transaction.error));
}

function isJoinBook(value: unknown): value is JoinBook {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}

function isJoinCapture(value: unknown): value is JoinCapture {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'bookId' in value &&
    typeof value.bookId === 'string' &&
    'page' in value &&
    typeof value.page === 'number'
  );
}

function scratchJoinReader(): JoinReader {
  const store = async (name: string): Promise<IDBObjectStore> => {
    const db = await scratchDatabase();
    return db.transaction(name, 'readonly').objectStore(name);
  };
  return {
    books: async () => (await requestResult((await store(JOIN_BOOKS)).getAll())).filter(isJoinBook),
    captures: async () =>
      (await requestResult((await store(JOIN_CAPTURES)).getAll())).filter(isJoinCapture),
    capturesOf: async (bookId) =>
      (await requestResult((await store(JOIN_CAPTURES)).index('bookId').getAll(bookId))).filter(
        isJoinCapture,
      ),
    book: async (id) => {
      const found: unknown = await requestResult((await store(JOIN_BOOKS)).get(id));
      return isJoinBook(found) ? found : undefined;
    },
  };
}

async function deleteScratch(name: string = SCRATCH_NAME): Promise<void> {
  await requestResult(indexedDB.deleteDatabase(name));
}

export {
  NOTES,
  SCRATCH_NAME,
  SCRATCH_VERSION,
  addWithClash,
  deleteScratch,
  fillSamples,
  finished,
  moveBook,
  requestResult,
  runPreset,
  scratchCounts,
  scratchDatabase,
  scratchExists,
  scratchJoinReader,
  seedJoin,
};
export type { ScratchCounts };
