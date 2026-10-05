import type {
  DiagramBox,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
} from '$lib/ui/components/diagram';

type Diagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const DIAGRAM_WIDTH = 360;

const STEP_X = 12;

const STEP_WIDTH = 184;

const STEP_HEIGHT = 48;

const OUTCOME_X = 248;

const OUTCOME_WIDTH = 108;

function step(y: number, label: string, detail: string): DiagramBox {
  return { kind: 'box', x: STEP_X, y, width: STEP_WIDTH, height: STEP_HEIGHT, label, detail };
}

const upload: DiagramBox = {
  kind: 'box',
  x: STEP_X,
  y: 8,
  width: STEP_WIDTH,
  height: 44,
  label: 'Upload',
  detail: 'hash, file name, title',
};
const shelfGroup: DiagramGroup = {
  kind: 'group',
  x: 0,
  y: 76,
  width: 208,
  height: 168,
  label: 'Shelf',
};
const shelfHash = step(108, 'Same hash?', 'always');
const shelfName = step(184, 'Same file name?', 'only when matching by name');
const restoreGroup: DiagramGroup = {
  kind: 'group',
  x: 0,
  y: 268,
  width: 208,
  height: 244,
  label: 'Restore',
  tone: 'accent',
};
const restoreHash = step(300, 'Same hash?', 'step 1');
const restoreName = step(376, 'Same file name?', 'step 2');
const restoreTitle = step(452, 'Same title?', 'step 3, either title');
const added: DiagramBox = {
  kind: 'box',
  x: STEP_X,
  y: 548,
  width: STEP_WIDTH,
  height: 44,
  label: 'Added',
  detail: 'a new id',
  tone: 'primary',
};
const held: DiagramBox = {
  kind: 'box',
  x: OUTCOME_X,
  y: 108,
  width: OUTCOME_WIDTH,
  height: 124,
  label: 'Already held',
  detail: 'joins that book',
  tone: 'primary',
};
const restored: DiagramBox = {
  kind: 'box',
  x: OUTCOME_X,
  y: 300,
  width: OUTCOME_WIDTH,
  height: 200,
  label: 'Restored',
  detail: 'under its old id',
  tone: 'accent',
};

const MATCHING_LADDER: Diagram = {
  label:
    'An upload is compared with the books on the shelf by hash, then by file name when matching by name; a match means already held. Otherwise it is compared with unreadable rows, then removed records, by hash, then file name, then title; a match restores the old id. Otherwise it is added.',
  width: DIAGRAM_WIDTH,
  height: 600,
  nodes: [
    shelfGroup,
    restoreGroup,
    upload,
    shelfHash,
    shelfName,
    restoreHash,
    restoreName,
    restoreTitle,
    added,
    held,
    restored,
  ],
  edges: [
    { from: upload, to: shelfHash },
    { from: shelfHash, to: held, label: 'yes' },
    { from: shelfHash, to: shelfName, label: 'no' },
    { from: shelfName, to: held, label: 'yes' },
    { from: shelfName, to: restoreHash, label: 'no' },
    { from: restoreHash, to: restored, label: 'yes' },
    { from: restoreHash, to: restoreName, label: 'no' },
    { from: restoreName, to: restored, label: 'yes' },
    { from: restoreName, to: restoreTitle, label: 'no' },
    { from: restoreTitle, to: restored, label: 'yes' },
    { from: restoreTitle, to: added, label: 'no' },
  ],
};

const LANE_WIDTH = 84;

const LANE_GAP = 8;

const LANE_ROW_Y = 200;

const LANE_HEIGHT = 56;

function lane(index: number, y: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: index * (LANE_WIDTH + LANE_GAP),
    y,
    width: LANE_WIDTH,
    height: LANE_HEIGHT,
    label,
    detail,
  };
}

const firstUpload: DiagramBox = {
  kind: 'box',
  x: 110,
  y: 8,
  width: 140,
  height: 44,
  label: 'Upload',
  detail: 'nothing matched',
};
const onShelf: DiagramBox = {
  kind: 'box',
  x: 0,
  y: 92,
  width: DIAGRAM_WIDTH,
  height: 48,
  label: 'On the shelf',
  detail: 'a readable book row',
  tone: 'primary',
};
const removedRecord: DiagramBox = {
  ...lane(0, LANE_ROW_Y, 'Removed', 'record kept'),
  tone: 'accent',
};
const sameFile = lane(1, LANE_ROW_Y, 'Same file', 'uploaded');
const unreadableRow: DiagramBox = {
  ...lane(2, LANE_ROW_Y, 'Unreadable', 'listed apart'),
  tone: 'accent',
};
const mergeAction = lane(3, LANE_ROW_Y, 'Merge', 'into a book');
const capturesDeleted = lane(0, 328, 'Deleted', 'for good');

const BOOK_LIFE: Diagram = {
  label:
    'An upload that matches nothing adds a book to the shelf. Remove turns it into a removed record whose captures wait; the same file uploaded again restores it. A book row a release can no longer read is listed apart, and Merge moves its captures onto a shelf book. Delete captures ends a removed record.',
  width: DIAGRAM_WIDTH,
  height: 392,
  nodes: [
    firstUpload,
    onShelf,
    removedRecord,
    sameFile,
    unreadableRow,
    mergeAction,
    capturesDeleted,
  ],
  edges: [
    { from: firstUpload, to: onShelf, label: 'added' },
    { from: onShelf, to: removedRecord, label: 'Remove' },
    { from: removedRecord, to: sameFile },
    { from: sameFile, to: onShelf, label: 'restored' },
    { from: onShelf, to: unreadableRow, label: 'unreadable' },
    { from: unreadableRow, to: mergeAction },
    { from: mergeAction, to: onShelf, label: 'merged' },
    { from: removedRecord, to: capturesDeleted, label: 'Delete captures' },
  ],
};

export { BOOK_LIFE, MATCHING_LADDER };
export type { Diagram };
