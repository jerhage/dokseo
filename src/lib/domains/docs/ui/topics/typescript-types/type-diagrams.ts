import type { DiagramBox, DiagramGroup, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../testing/testing-diagrams';

const BOX_HEIGHT = 44;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone?: DiagramTone,
): DiagramBox {
  return {
    kind: 'box',
    x,
    y,
    width,
    height: BOX_HEIGHT,
    label,
    detail,
    ...(tone === undefined ? {} : { tone }),
  };
}

function group(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  tone: DiagramTone,
): DiagramGroup {
  return { kind: 'group', x, y, width, height, label, tone };
}

const SOURCE_WIDTH = 106;
const SOURCE_GAP = 21;

const outside = group(0, 0, 360, 96, 'outside: unknown', 'neutral');
const storedRow = box(8, 40, SOURCE_WIDTH, 'IndexedDB row', 'any version');
const importFile = box(
  8 + SOURCE_WIDTH + SOURCE_GAP,
  40,
  SOURCE_WIDTH,
  'Export file',
  'any device',
);
const savedList = box(8 + (SOURCE_WIDTH + SOURCE_GAP) * 2, 40, 92, 'localStorage', 'JSON text');
const parser = box(70, 116, 220, 'Field-by-field checks', 'type guards, defaults', 'primary');
const inside = group(0, 232, 360, 96, 'inside: typed', 'accent');
const parsedBook = box(8, 272, 160, 'Typed values', 'Book, Capture, string[]');
const unreadable = box(192, 272, 160, 'Set aside or default', 'unreadable row, or []');

const PARSE_BOUNDARY: DiagramSpec = {
  label:
    'Outside the boundary, an IndexedDB row, an export file and a localStorage entry are all unknown. Each goes through field-by-field checks. Inside, a value that passes is a typed value such as a Book, a Capture or a list of strings; a value that fails is set aside as an unreadable row or replaced by a default such as an empty list.',
  width: 360,
  height: 328,
  nodes: [outside, storedRow, importFile, savedList, parser, inside, parsedBook, unreadable],
  edges: [
    { from: storedRow, to: parser },
    { from: importFile, to: parser },
    { from: savedList, to: parser },
    { from: parser, to: parsedBook, label: 'passes' },
    { from: parser, to: unreadable, label: 'fails' },
  ],
};

export { PARSE_BOUNDARY };
