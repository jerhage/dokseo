import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import { NOTES, finished, requestResult, scratchDatabase } from './scratch-idb';

type CommitVariant = 'unrelated-await' | 'unrelated-first' | 'own-request';

type CommitTone = 'step' | 'event' | 'failure';

type CommitNote = (tone: CommitTone, text: string) => void;

const COMMIT_VARIANTS: readonly { readonly value: CommitVariant; readonly label: string }[] = [
  { value: 'unrelated-await', label: 'Timer inside' },
  { value: 'unrelated-first', label: 'Timer first' },
  { value: 'own-request', label: 'Own request' },
];

function laterTask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function watch(transaction: IDBTransaction, note: CommitNote): Promise<'complete' | 'abort'> {
  const done = finished(transaction);
  void done.then((outcome) => note('event', `transaction fired ${outcome}`));
  return done;
}

function tryPut(store: IDBObjectStore, text: string, note: CommitNote): void {
  try {
    store.put({ text, savedAt: Date.now() });
    note('step', `put('${text}') was accepted`);
  } catch (cause) {
    const name = cause instanceof DOMException ? cause.name : describeCause(cause);
    note('failure', `put('${text}') threw ${name}`);
  }
}

async function unrelatedAwait(db: IDBDatabase, note: CommitNote): Promise<void> {
  const transaction = db.transaction(NOTES, 'readwrite');
  const done = watch(transaction, note);
  const store = transaction.objectStore(NOTES);
  tryPut(store, 'first', note);
  note('step', 'await a 0 ms timer');
  await laterTask();
  note('step', 'the timer fired in a later task');
  tryPut(store, 'second', note);
  await done;
}

async function unrelatedFirst(db: IDBDatabase, note: CommitNote): Promise<void> {
  note('step', 'await a 0 ms timer before the transaction exists');
  await laterTask();
  note('step', 'the timer fired; now db.transaction()');
  const transaction = db.transaction(NOTES, 'readwrite');
  const done = watch(transaction, note);
  const store = transaction.objectStore(NOTES);
  tryPut(store, 'first', note);
  tryPut(store, 'second', note);
  await done;
}

async function ownRequest(db: IDBDatabase, note: CommitNote): Promise<void> {
  const transaction = db.transaction(NOTES, 'readwrite');
  const done = watch(transaction, note);
  const store = transaction.objectStore(NOTES);
  const first = store.put({ text: 'first', savedAt: Date.now() });
  note('step', "put('first'), then await a promise its success event resolves");
  await requestResult(first);
  note('step', 'the put succeeded; this line runs during its success event');
  tryPut(store, 'second', note);
  await done;
}

async function runCommitVariant(variant: CommitVariant, note: CommitNote): Promise<void> {
  const db = await scratchDatabase();
  await match(variant)
    .with('unrelated-await', () => unrelatedAwait(db, note))
    .with('unrelated-first', () => unrelatedFirst(db, note))
    .with('own-request', () => ownRequest(db, note))
    .exhaustive();
  const stored = await requestResult(db.transaction(NOTES, 'readonly').objectStore(NOTES).count());
  note('step', `the notes store now holds ${stored} ${stored === 1 ? 'record' : 'records'}`);
}

export { COMMIT_VARIANTS, runCommitVariant };
export type { CommitNote, CommitTone, CommitVariant };
