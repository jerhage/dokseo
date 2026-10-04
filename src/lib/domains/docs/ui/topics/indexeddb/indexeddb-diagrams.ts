import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: 52, label, detail, tone };
}

function group(x: number, y: number, width: number, height: number, label: string): DiagramGroup {
  return { kind: 'group', x, y, width, height, label };
}

const database = group(0, 0, 360, 300, 'Database: a name and a version');
const store = box(
  10,
  36,
  340,
  'Object store captures',
  'records sorted by primary key id',
  'primary',
);
const index = box(10, 136, 140, 'Index bookId', 'sorted by bookId, then id', 'accent');
const records = box(210, 136, 140, 'Records', 'id → a cloned value');
const indexEntry = box(10, 236, 140, "Entry 'b2' → 3", 'index key → primary key', 'accent');
const record = box(210, 236, 140, 'Record 3', "{ id: 3, bookId: 'b2' }");

const DATABASE_LAYOUT: DiagramSpec = {
  label:
    'A database, which has a name and a version, holds the object store captures, whose records are sorted by their primary key, id. The store keeps an index named bookId, sorted by bookId and then by id. Each index entry maps an index key, such as b2, to a primary key, such as 3, and the primary key finds the record, a cloned value with id 3 and bookId b2.',
  width: 360,
  height: 300,
  nodes: [database, store, index, records, indexEntry, record],
  edges: [
    { from: store, to: index, label: 'maintains' },
    { from: store, to: records, label: 'holds' },
    { from: index, to: indexEntry },
    { from: records, to: record },
    { from: indexEntry, to: record, label: 'by key' },
  ],
};

const requestsSide = group(0, 0, 170, 370, 'Requests only');
const created = box(10, 36, 150, 'transaction()', 'active', 'primary');
const taskEnds = box(10, 124, 150, 'The task ends', 'inactive, put pending');
const success = box(10, 212, 150, 'put succeeds', 'active in the event');
const committed = box(10, 300, 150, 'Nothing pending', 'commit, then complete', 'primary');
const awaitSide = group(190, 0, 170, 370, 'An unrelated await');
const awaited = box(200, 36, 150, 'await fetch()', 'active, put pending', 'primary');
const awaitEnds = box(200, 124, 150, 'The task ends', 'inactive');
const finishedEarly = box(200, 212, 150, 'put succeeds', 'nothing more: commit');
const late = box(200, 300, 150, 'fetch resolves', 'put() throws', 'accent');

const TRANSACTION_LIFETIME: DiagramSpec = {
  label:
    'Left, requests only: a transaction is active when created, inactive when the task ends with a put pending, active again while the put success event is dispatched, where more requests may be placed, and once nothing is pending it commits and fires complete. Right, an unrelated await: the transaction is created and a put is placed, then the code awaits a fetch. The task ends and the transaction is inactive. The put succeeds, nothing more was requested, so the transaction commits. When the fetch resolves in a later task, the next put throws TransactionInactiveError.',
  width: 360,
  height: 370,
  nodes: [
    requestsSide,
    awaitSide,
    created,
    taskEnds,
    success,
    committed,
    awaited,
    awaitEnds,
    finishedEarly,
    late,
  ],
  edges: [
    { from: created, to: taskEnds },
    { from: taskEnds, to: success },
    { from: success, to: committed },
    { from: awaited, to: awaitEnds },
    { from: awaitEnds, to: finishedEarly },
    { from: finishedEarly, to: late },
  ],
};

export { DATABASE_LAYOUT, TRANSACTION_LIFETIME };
