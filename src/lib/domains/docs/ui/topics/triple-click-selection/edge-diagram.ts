type EdgeMark = {
  readonly x: number;
  readonly label: string;
  readonly anchor: 'start' | 'middle';
};

type EdgeDiagram = {
  readonly label: string;
  readonly start: EdgeMark;
  readonly end: EdgeMark;
  readonly cfi: string;
  readonly result: string;
};

type DomBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly label: string;
};

type DomLine = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

type ChildSlot = { readonly x: number; readonly label: string };

const EDGE_DIAGRAM_WIDTH = 360;

const EDGE_DIAGRAM_HEIGHT = 248;

const BOX_HEIGHT = 32;

const SLOT_TOP = 112;

const SLOT_BOTTOM = 160;

const SLOT_LABEL_Y = 174;

const MARK_LABEL_Y = 194;

const CFI_Y = 218;

const RESULT_Y = 238;

const TEXT_LEFT = 16;

const DOM_BOXES: readonly DomBox[] = [
  { x: 130, y: 8, width: 100, label: '<body> /4' },
  { x: 16, y: 64, width: 152, label: '<p> /16' },
  { x: 208, y: 64, width: 136, label: '<p> /18' },
  { x: 40, y: 120, width: 104, label: 'text /1' },
  { x: 232, y: 120, width: 88, label: 'text /1' },
];

const DOM_LINES: readonly DomLine[] = [
  { x1: 160, y1: 40, x2: 92, y2: 64 },
  { x1: 200, y1: 40, x2: 276, y2: 64 },
  { x1: 92, y1: 96, x2: 92, y2: 120 },
  { x1: 276, y1: 96, x2: 276, y2: 120 },
];

const CHILD_SLOTS: readonly ChildSlot[] = [
  { x: 28, label: '0' },
  { x: 156, label: '1' },
  { x: 220, label: '0' },
];

const FIREFOX_EDGES: EdgeDiagram = {
  label:
    'Firefox: the start is on the paragraph element at child offset 0, before its text node, and the end is on the same element at child offset 1, after it. The CFI is epubcfi(/6/12!/4,/16,/16), with the same start and end.',
  start: { x: 28, label: 'start (p, 0)', anchor: 'start' },
  end: { x: 156, label: 'end (p, 1)', anchor: 'middle' },
  cfi: 'epubcfi(/6/12!/4,/16,/16)',
  result: 'start and end print the same: collapsed',
};

const CHROME_EDGES: EdgeDiagram = {
  label:
    'Chrome and Safari: the start is in the text node at character 0, and the end is on the next paragraph element at child offset 0. The CFI is epubcfi(/6/12!/4,/16/1:0,/18).',
  start: { x: 40, label: 'start (text, 0)', anchor: 'start' },
  end: { x: 220, label: 'end (next p, 0)', anchor: 'middle' },
  cfi: 'epubcfi(/6/12!/4,/16/1:0,/18)',
  result: 'a range over the whole paragraph',
};

export {
  BOX_HEIGHT,
  CFI_Y,
  CHILD_SLOTS,
  CHROME_EDGES,
  DOM_BOXES,
  DOM_LINES,
  EDGE_DIAGRAM_HEIGHT,
  EDGE_DIAGRAM_WIDTH,
  FIREFOX_EDGES,
  MARK_LABEL_Y,
  RESULT_Y,
  SLOT_BOTTOM,
  SLOT_LABEL_Y,
  SLOT_TOP,
  TEXT_LEFT,
};
export type { ChildSlot, DomBox, DomLine, EdgeDiagram, EdgeMark };
