import type { DiagramBox, DiagramEdge } from '$lib/ui/components/diagram';

const COPING_WIDTH = 360;

const COPING_HEIGHT = 224;

const COLUMN_WIDTH = 164;

const BOX_HEIGHT = 48;

const ROW_STEP = 80;

const TOP = 8;

const LEFT = 8;

const RIGHT = 188;

function box(x: number, row: number, label: string, detail: string, primary: boolean): DiagramBox {
  return {
    kind: 'box',
    x,
    y: TOP + row * ROW_STEP,
    width: COLUMN_WIDTH,
    height: BOX_HEIGHT,
    label,
    detail,
    ...(primary ? { tone: 'primary' } : {}),
  };
}

const selection = box(LEFT, 0, 'A new selection', '(p, 0) to (p, 1)', false);
const moved = box(LEFT, 1, 'textEdges', '(text, 0) to (text, end)', true);
const written = box(LEFT, 2, 'getCFI', '/4/16,/1:0,/1:N', false);

const stored = box(RIGHT, 0, 'A stored capture', '/4,/16,/16', false);
const detected = box(RIGHT, 1, 'collapsedCfi', 'start equals end', true);
const searched = box(RIGHT, 2, 'The quote search', 'a fresh CFI over the text', false);

const COPING_NODES: readonly DiagramBox[] = [selection, moved, written, stored, detected, searched];

const COPING_EDGES: readonly DiagramEdge[] = [
  { from: selection, to: moved },
  { from: moved, to: written },
  { from: stored, to: detected },
  { from: detected, to: searched },
];

const COPING_LABEL =
  'Left: a new selection from (p, 0) to (p, 1) goes through textEdges, which moves its edges into the text, and then getCFI writes a range over the text. Right: a stored collapsed CFI is caught by collapsedCfi, and the passage is found again by its quote.';

export { COPING_EDGES, COPING_HEIGHT, COPING_LABEL, COPING_NODES, COPING_WIDTH };
