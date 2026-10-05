import type { DiagramBox, DiagramEdge, DiagramNode } from '$lib/ui/components/diagram';
import { pointerKinds } from '$lib/shared/turn-settings';
import { DEVICE_PRESETS, presetMatches } from '../../../domain/pointer-devices';

type Diagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const DIAGRAM_WIDTH = 360;

const QUESTION_X = 4;

const QUESTION_WIDTH = 172;

const OUTCOME_X = 212;

const OUTCOME_WIDTH = 144;

const ROW_HEIGHT = 48;

function question(y: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: QUESTION_X,
    y,
    width: QUESTION_WIDTH,
    height: ROW_HEIGHT,
    label,
    detail,
  };
}

function outcome(y: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: OUTCOME_X,
    y,
    width: OUTCOME_WIDTH,
    height: ROW_HEIGHT,
    label,
    detail,
    tone: 'primary',
  };
}

const fingerDown = question(8, 'Finger down', 'start the clock');
const secondFinger = question(88, 'Second finger?', 'before a plan');
const strayed = question(168, 'Moved 12 px?', 'on either axis');
const heldStill = question(248, 'Still at 400 ms?', 'not lifted yet');
const centreWaits = question(328, 'Lifted. Wait?', 'center, double taps on');
const secondTap = question(408, 'Again in 300 ms?', 'within 40 px');
const pinch = outcome(88, 'Pinch', 'scale and midpoint');
const drag = outcome(168, 'Drag', 'select, pan or swipe');
const longPress = outcome(248, 'Long press', 'starts a selection');
const tapNow = outcome(328, 'Tap', 'at once');
const doubleTap = outcome(408, 'Double tap', 'zoom');
const lateTap = outcome(488, 'Tap', '300 ms late');

const GESTURE_TREE: Diagram = {
  label:
    'A finger goes down. A second finger before a plan makes a pinch. A move of 12 px makes a drag, which is a selection, a pan or a swipe by context. A finger held still for 400 ms makes a long press. A finger lifted earlier is a tap at once, unless it is in the center with double taps on: then a second tap within 300 ms and 40 px makes a double tap, and otherwise the tap is reported 300 ms late.',
  width: DIAGRAM_WIDTH,
  height: 544,
  nodes: [
    fingerDown,
    secondFinger,
    strayed,
    heldStill,
    centreWaits,
    secondTap,
    pinch,
    drag,
    longPress,
    tapNow,
    doubleTap,
    lateTap,
  ],
  edges: [
    { from: fingerDown, to: secondFinger },
    { from: secondFinger, to: pinch, label: 'yes' },
    { from: secondFinger, to: strayed, label: 'no' },
    { from: strayed, to: drag, label: 'yes' },
    { from: strayed, to: heldStill, label: 'no' },
    { from: heldStill, to: longPress, label: 'yes' },
    { from: heldStill, to: centreWaits, label: 'no' },
    { from: centreWaits, to: tapNow, label: 'no' },
    { from: centreWaits, to: secondTap, label: 'yes' },
    { from: secondTap, to: doubleTap, label: 'yes' },
    { from: secondTap, to: lateTap, label: 'no' },
  ],
};

const COLUMN_WIDTH = 108;

const DEVICE_STEP = 60;

const DEVICE_HEIGHT = 48;

const QUERY_X = 126;

const SETTING_X = 252;

const devices: readonly DiagramBox[] = DEVICE_PRESETS.map((preset, index) => ({
  kind: 'box',
  x: 0,
  y: 8 + index * DEVICE_STEP,
  width: COLUMN_WIDTH,
  height: DEVICE_HEIGHT,
  label: preset.label,
  detail: preset.detail,
}));

const coarseQuery: DiagramBox = {
  kind: 'box',
  x: QUERY_X,
  y: 68,
  width: COLUMN_WIDTH,
  height: DEVICE_HEIGHT,
  label: 'any-pointer',
  detail: 'coarse',
  tone: 'accent',
};

const hoverQuery: DiagramBox = {
  kind: 'box',
  x: QUERY_X,
  y: 200,
  width: COLUMN_WIDTH,
  height: DEVICE_HEIGHT,
  label: 'any-hover',
  detail: 'hover',
  tone: 'accent',
};

const touchSetting: DiagramBox = {
  kind: 'box',
  x: SETTING_X,
  y: 68,
  width: COLUMN_WIDTH,
  height: DEVICE_HEIGHT,
  label: 'Page turns',
  detail: 'tap zones or swipe',
  tone: 'primary',
};

const edgeSetting: DiagramBox = {
  kind: 'box',
  x: SETTING_X,
  y: 200,
  width: COLUMN_WIDTH,
  height: DEVICE_HEIGHT,
  label: 'Edge clicks',
  detail: 'turn the page',
  tone: 'primary',
};

function deviceEdges(): readonly DiagramEdge[] {
  return DEVICE_PRESETS.flatMap((preset, index) => {
    const device = devices[index];
    if (device === undefined) return [];

    const kinds = pointerKinds(presetMatches(preset));
    const touch = kinds === 'touch' || kinds === 'touch-and-mouse';
    const mouse = kinds === 'mouse' || kinds === 'touch-and-mouse';
    return [
      ...(touch ? [{ from: device, to: coarseQuery }] : []),
      ...(mouse ? [{ from: device, to: hoverQuery }] : []),
    ];
  });
}

const DEVICE_SETTINGS: Diagram = {
  label:
    'An iPhone, an iPad used with fingers and an iPad whose Pencil was used lately match any-pointer: coarse only, so they show the Page turns choice. An iPad with a trackpad matches any-pointer: coarse and any-hover: hover, so it shows both settings. A desktop with a mouse matches any-hover: hover only, so it shows Click page edges to turn.',
  width: DIAGRAM_WIDTH,
  height: 8 + (DEVICE_PRESETS.length - 1) * DEVICE_STEP + DEVICE_HEIGHT + 8,
  nodes: [...devices, coarseQuery, hoverQuery, touchSetting, edgeSetting],
  edges: [
    ...deviceEdges(),
    { from: coarseQuery, to: touchSetting },
    { from: hoverQuery, to: edgeSetting },
  ],
};

export { DEVICE_SETTINGS, GESTURE_TREE };
export type { Diagram };
