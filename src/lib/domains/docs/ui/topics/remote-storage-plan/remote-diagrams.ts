import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const BOX_HEIGHT = 52;
const HALF_WIDTH = 170;
const RIGHT_COLUMN = 190;

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

function group(y: number, height: number, label: string, tone: DiagramTone): DiagramGroup {
  return { kind: 'group', x: 0, y, width: 360, height, label, tone };
}

const deviceGroup = group(0, 96, 'Tab: On this device', 'neutral');
const heldBooks = box(8, 34, 164, 'Book', 'every held book, file in OPFS');
const deviceFilters = box(
  180,
  34,
  172,
  'Origin badges and filters',
  'from a catalog, or Added from files',
);

const catalogGroup = group(120, 224, 'One tab per catalog: a RemoteItem for each entry', 'neutral');
const remoteItem = box(8, 154, 164, 'remote', 'on the server only', 'primary');
const unsupportedItem = box(180, 154, 172, 'unsupported', 'no EPUB, CBZ/ZIP or PDF link');
const downloadingItem = box(8, 218, 164, 'downloading', 'with progress');
const failedItem = box(180, 218, 172, 'download-failed', 'with a reason');
const heldItem = box(8, 282, 164, 'held', 'the book is on this device', 'accent');
const heldOlderItem = box(180, 282, 172, 'held-older', 'the server has a newer updated');

const VIEWS: DiagramSpec = {
  label:
    'The library screen has one tab called On this device and one tab for each catalog. On this device lists every held book, with origin badges and the filters from a catalog and Added from files. A catalog tab lists its entries as RemoteItem values: remote, unsupported, downloading, download-failed, held and held-older. A remote item becomes downloading, which ends as held or as download-failed.',
  width: 360,
  height: 344,
  nodes: [
    deviceGroup,
    heldBooks,
    deviceFilters,
    catalogGroup,
    remoteItem,
    unsupportedItem,
    downloadingItem,
    failedItem,
    heldItem,
    heldOlderItem,
  ],
  edges: [
    { from: remoteItem, to: downloadingItem },
    { from: downloadingItem, to: failedItem },
    { from: downloadingItem, to: heldItem },
  ],
};

const fetchFile = box(
  0,
  0,
  360,
  'Fetch the acquisition link',
  'a File named after the entry, no streaming',
  'primary',
);
const openFile = box(0, 84, 360, 'openFile', 'identity, deduplication, OPFS, the atomic add');
const added = box(0, 168, HALF_WIDTH, 'added or restored', 'a new or removed book');
const alreadyHeld = box(RIGHT_COLUMN, 168, HALF_WIDTH, 'already-held', 'same contentHash');
const writeOrigin = box(
  0,
  252,
  360,
  'Write the BookOrigin',
  'for the bookId either way: a book added by hand is linked, not duplicated',
  'accent',
);

const DOWNLOAD_FLOW: DiagramSpec = {
  label:
    'A download fetches the acquisition link as a File named after the entry. The File goes to openFile, which does identity, deduplication, the write to OPFS and the atomic add. The result is added, a new book, or already-held, the same contentHash. In both cases the app then writes the BookOrigin for that bookId, so a book added by hand is linked and not duplicated.',
  width: 360,
  height: 304,
  nodes: [fetchFile, openFile, added, alreadyHeld, writeOrigin],
  edges: [
    { from: fetchFile, to: openFile },
    { from: openFile, to: added },
    { from: openFile, to: alreadyHeld },
    { from: added, to: writeOrigin },
    { from: alreadyHeld, to: writeOrigin },
  ],
};

export { DOWNLOAD_FLOW, VIEWS };
