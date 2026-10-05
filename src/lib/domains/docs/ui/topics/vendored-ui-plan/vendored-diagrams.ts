import type { DiagramBox, DiagramTone } from '$lib/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const BOX_HEIGHT = 52;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: BOX_HEIGHT, label, detail, tone };
}

const libraryMain = box(0, 0, 360, 'Library repository, main', 'tagged versions', 'primary');
const pushedBranch = box(186, 120, 80, 'A branch', 'button-type', 'accent');
const appB = box(0, 240, 170, 'App B', 'src/lib/ui/');
const appA = box(190, 240, 170, 'App A', 'src/lib/ui/, edited');

const VENDORING_FLOW: DiagramSpec = {
  label:
    'One library repository and two apps. Each app vendors the library at src/lib/ui with git subtree add, and takes a newer tagged version with git subtree pull. App A has edited its copy and sends the library part of its history to a branch of the library repository with git subtree push. The library merges that branch into main, and both apps receive the fix with their next pull.',
  width: 360,
  height: 292,
  nodes: [libraryMain, pushedBranch, appB, appA],
  edges: [
    { from: libraryMain, to: appB, label: 'add, pull' },
    { from: libraryMain, to: appA, label: 'add, pull' },
    { from: appA, to: pushedBranch, label: 'push' },
    { from: pushedBranch, to: libraryMain, label: 'merge' },
  ],
};

const appStart = box(0, 0, 220, '6d0a052', 'chore: start app A');
const addMerge = box(0, 76, 220, '501aa03', "Merge commit … as 'src/lib/ui'");
const firstSquash = box(236, 76, 124, 'ba921a0', 'content of v1.0.0');
const localFix = box(0, 152, 220, '054d890', 'fix(ui): give Button a type');
const appDocs = box(0, 228, 220, '6d4ae09', 'docs: describe app A');
const pullMerge = box(0, 304, 220, '11dd010', 'chore(ui): update to v1.1.0', 'primary');
const secondSquash = box(236, 304, 124, '7b12207', 'v1.0.0 to v1.1.0', 'accent');

const SQUASH_PULL_HISTORY: DiagramSpec = {
  label:
    "App A's history, oldest first, with arrows from a parent to its child. Before the pull: the first commit 6d0a052, the merge 501aa03 that joined it with the squash commit ba921a0 holding the content of library version 1.0.0, then the local library fix 054d890 and the app commit 6d4ae09. The pull adds two commits: a squash commit 7b12207 whose parent is the previous squash commit and which holds the changes from version 1.0.0 to 1.1.0, and a merge 11dd010 whose parents are 6d4ae09 and 7b12207.",
  width: 360,
  height: 356,
  nodes: [appStart, addMerge, firstSquash, localFix, appDocs, pullMerge, secondSquash],
  edges: [
    { from: appStart, to: addMerge },
    { from: firstSquash, to: addMerge },
    { from: addMerge, to: localFix },
    { from: localFix, to: appDocs },
    { from: appDocs, to: pullMerge },
    { from: firstSquash, to: secondSquash, label: 'parent' },
    { from: secondSquash, to: pullMerge },
  ],
};

export { SQUASH_PULL_HISTORY, VENDORING_FLOW };
