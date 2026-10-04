import type { DiagramBox, DiagramTone } from '$lib/components/diagram';
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

const UNIT_WIDTH = 84;
const UNIT_GAP = 8;
const POINT_WIDTH = UNIT_WIDTH * 2 + UNIT_GAP;
const POINT_GAP = 8;
const SECOND = POINT_WIDTH + POINT_GAP;

const grapheme = box(60, 0, 240, 'か\u3099', 'one grapheme on screen', 'accent');
const baseKana = box(0, 90, POINT_WIDTH, 'U+304B', 'か, a code point', 'primary');
const voicedMark = box(SECOND, 90, POINT_WIDTH, 'U+3099', 'combining voiced mark', 'primary');
const baseUtf16 = box(0, 180, UNIT_WIDTH, '304B', 'UTF-16: 1 unit');
const baseUtf8 = box(UNIT_WIDTH + UNIT_GAP, 180, UNIT_WIDTH, 'E3 81 8B', 'UTF-8: 3 bytes');
const markUtf16 = box(SECOND, 180, UNIT_WIDTH, '3099', 'UTF-16: 1 unit');
const markUtf8 = box(SECOND + UNIT_WIDTH + UNIT_GAP, 180, UNIT_WIDTH, 'E3 82 99', 'UTF-8: 3 bytes');

const ENCODING_LAYERS: DiagramSpec = {
  label:
    'The grapheme が, written decomposed, is two code points: U+304B, the kana か, and U+3099, the combining voiced mark. In UTF-16 each code point is one 16-bit unit, 304B and 3099. In UTF-8 each is three bytes, E3 81 8B and E3 82 99.',
  width: 360,
  height: 180 + BOX_HEIGHT,
  nodes: [grapheme, baseKana, voicedMark, baseUtf16, baseUtf8, markUtf16, markUtf8],
  edges: [
    { from: grapheme, to: baseKana },
    { from: grapheme, to: voicedMark },
    { from: baseKana, to: baseUtf16 },
    { from: baseKana, to: baseUtf8 },
    { from: voicedMark, to: markUtf16 },
    { from: voicedMark, to: markUtf8 },
  ],
};

const FORM_WIDTH = 150;
const RIGHT = 360 - FORM_WIDTH;
const TOP = 24;
const LOWER = 130;

const nfc = box(0, TOP, FORM_WIDTH, 'NFC', 'ｶﾞ stays ｶﾞ; が stays が', 'primary');
const nfd = box(RIGHT, TOP, FORM_WIDTH, 'NFD', 'が becomes か + U+3099', 'primary');
const nfkc = box(0, LOWER, FORM_WIDTH, 'NFKC', 'ｶﾞ becomes ガ', 'accent');
const nfkd = box(RIGHT, LOWER, FORM_WIDTH, 'NFKD', 'ｶﾞ becomes カ + U+3099', 'accent');

const NORMALIZATION_SQUARE: DiagramSpec = {
  label:
    'Four boxes in a square. The top row is canonical: NFC, composed, and NFD, decomposed. The bottom row is compatibility: NFKC, composed, and NFKD, decomposed. Composing turns the right-hand column into the left. Compatibility mapping turns the top row into the bottom row. Half-width ｶﾞ is unchanged by NFC and NFD and becomes full-width ガ under NFKC.',
  width: 360,
  height: LOWER + BOX_HEIGHT,
  nodes: [nfc, nfd, nfkc, nfkd],
  edges: [
    { from: nfd, to: nfc, label: 'compose' },
    { from: nfkd, to: nfkc, label: 'compose' },
    { from: nfc, to: nfkc, label: 'compatibility' },
    { from: nfd, to: nfkd, label: 'compatibility' },
  ],
};

export { ENCODING_LAYERS, NORMALIZATION_SQUARE };
