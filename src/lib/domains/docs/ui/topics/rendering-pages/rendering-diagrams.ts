import type { DiagramBox, DiagramGroup } from '$lib/components/diagram';
import { AHEAD_SCREENS, BEHIND_SCREENS, MOST_SLICES } from '$lib/domains/viewing/domain/strip';
import type { DiagramSpec } from '../storage/storage-diagrams';

const COLUMN_X = [0, 190] as const;

const ROW_STEP = 76;

const BOX_WIDTH = 170;

const BOX_HEIGHT = 52;

function pipelineBox(column: 0 | 1, row: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: COLUMN_X[column],
    y: row * ROW_STEP,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    label,
    detail,
  };
}

const bookFile: DiagramBox = {
  kind: 'box',
  x: 95,
  y: 0,
  width: BOX_WIDTH,
  height: BOX_HEIGHT,
  label: 'Book file',
  detail: 'a Blob over OPFS, unread',
  tone: 'primary',
};
const directory = pipelineBox(0, 1, 'ZIP central directory', 'names, sizes, offsets');
const crossReference = pipelineBox(1, 1, 'PDF cross-reference', 'read in 64 KB ranges');
const entryBytes = pipelineBox(0, 2, "One entry's bytes", 'an encoded JPEG or PNG');
const operators = pipelineBox(1, 2, 'Operator list', "built in pdf.js's worker");
const encoded = {
  ...pipelineBox(0, 3, '<img> over a blob: URL', "picture kind 'encoded'"),
  tone: 'accent',
} as const;
const offscreen = pipelineBox(1, 3, 'OffscreenCanvas', 'painted at scale 2');
const browserDecode = pipelineBox(0, 4, 'Browser decodes', 'and may drop the pixels');
const drawn = {
  ...pipelineBox(1, 4, 'ImageBitmap to canvas', "picture kind 'drawn'"),
  tone: 'accent',
} as const;
const screen: DiagramBox = {
  kind: 'box',
  x: 95,
  y: 5 * ROW_STEP,
  width: BOX_WIDTH,
  height: BOX_HEIGHT,
  label: 'Pixels on screen',
  detail: 'scaled by CSS to device pixels',
  tone: 'primary',
};

const FILE_TO_PIXELS: DiagramSpec = {
  label:
    'A book file is a Blob that has not been read. For a ZIP, the central directory gives each entry an offset, one entry is read out as encoded image bytes, shown in an img element over a blob URL, and decoded by the browser, which may drop the pixels later. For a PDF, pdf.js reads the cross-reference by byte range, its worker builds the operator list for a page, the page is painted on an OffscreenCanvas at scale 2, and the resulting ImageBitmap is transferred into a canvas. Both end as pixels on screen, scaled by CSS to device pixels.',
  width: 360,
  height: 5 * ROW_STEP + BOX_HEIGHT,
  nodes: [
    bookFile,
    directory,
    crossReference,
    entryBytes,
    operators,
    encoded,
    offscreen,
    browserDecode,
    drawn,
    screen,
  ],
  edges: [
    { from: bookFile, to: directory, label: 'ZIP' },
    { from: bookFile, to: crossReference, label: 'PDF' },
    { from: directory, to: entryBytes },
    { from: crossReference, to: operators },
    { from: entryBytes, to: encoded },
    { from: operators, to: offscreen },
    { from: encoded, to: browserDecode },
    { from: offscreen, to: drawn },
    { from: browserDecode, to: screen },
    { from: drawn, to: screen },
  ],
};

const WINDOW_TOP = 34;

const SLOT_HEIGHT = 44;

const SLOT_GAP = 8;

function windowGroup(column: 0 | 1, slots: number, label: string): DiagramGroup {
  return {
    kind: 'group',
    x: COLUMN_X[column],
    y: 0,
    width: BOX_WIDTH,
    height: WINDOW_TOP + slots * (SLOT_HEIGHT + SLOT_GAP) + 2,
    label,
  };
}

function windowSlot(group: DiagramGroup, slot: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: group.x + 10,
    y: group.y + WINDOW_TOP + slot * (SLOT_HEIGHT + SLOT_GAP),
    width: BOX_WIDTH - 20,
    height: SLOT_HEIGHT,
    label,
    detail,
  };
}

const strip = windowGroup(0, 5, 'Strip, scrolling down');
const paged = windowGroup(1, 5, 'Pages');

const PREFETCH_WINDOW: DiagramSpec = {
  label:
    'In the strip, scrolling down, slices more than one screen above are released, one screen behind and the slices on screen are mounted, three screens ahead are mounted first, at most eight slices in all, and slices further down are released. In the paged reader, the previous group, the current group and the next group are mounted, and every other group is released.',
  width: 360,
  height: strip.height,
  nodes: [
    strip,
    paged,
    windowSlot(strip, 0, 'Released', 'more than 1 screen up'),
    windowSlot(strip, 1, 'Mounted', `${BEHIND_SCREENS} screen behind`),
    { ...windowSlot(strip, 2, 'On screen', 'always kept'), tone: 'primary' },
    {
      ...windowSlot(
        strip,
        3,
        'Mounted first',
        `${AHEAD_SCREENS} screens ahead, cap ${MOST_SLICES}`,
      ),
      tone: 'accent',
    },
    windowSlot(strip, 4, 'Released', 'further down'),
    windowSlot(paged, 0, 'Released', 'earlier groups'),
    windowSlot(paged, 1, 'Mounted', 'previous group'),
    { ...windowSlot(paged, 2, 'On screen', 'current group'), tone: 'primary' },
    { ...windowSlot(paged, 3, 'Mounted', 'next group'), tone: 'accent' },
    windowSlot(paged, 4, 'Released', 'later groups'),
  ],
  edges: [],
};

export { FILE_TO_PIXELS, PREFETCH_WINDOW };
