import type { DiagramBox, DiagramEdge } from '$lib/components/diagram';

type Diagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramBox[];
  readonly edges: readonly DiagramEdge[];
};

const DIAGRAM_WIDTH = 360;

const LANE_WIDTH = 164;

const ROW_HEIGHT = 52;

const ROW_STEP = 72;

const LEFT_LANE = 8;

const RIGHT_LANE = 188;

const tasks: DiagramBox = {
  kind: 'box',
  x: LEFT_LANE,
  y: 8,
  width: LANE_WIDTH,
  height: ROW_HEIGHT,
  label: 'Task queues',
  detail: 'timers, input, messages',
};
const microtasks: DiagramBox = {
  kind: 'box',
  x: RIGHT_LANE,
  y: 8,
  width: LANE_WIDTH,
  height: ROW_HEIGHT,
  label: 'Microtask queue',
  detail: 'then, await',
  tone: 'accent',
};
const stack: DiagramBox = {
  kind: 'box',
  x: LEFT_LANE,
  y: 128,
  width: RIGHT_LANE + LANE_WIDTH - LEFT_LANE,
  height: ROW_HEIGHT,
  label: 'Call stack',
  detail: 'one piece of script runs to the end',
  tone: 'primary',
};
const rendering: DiagramBox = {
  kind: 'box',
  x: LEFT_LANE,
  y: 248,
  width: RIGHT_LANE + LANE_WIDTH - LEFT_LANE,
  height: ROW_HEIGHT,
  label: 'Rendering, when a frame is due',
  detail: 'rAF, style, layout, ResizeObserver, paint',
};

const EVENT_LOOP: Diagram = {
  label:
    'The event loop takes one task from a task queue and runs it on the call stack. Whenever the stack empties, every microtask runs. When a frame is due, the rendering step runs animation frame callbacks, layout, resize observers and paint.',
  width: DIAGRAM_WIDTH,
  height: 308,
  nodes: [tasks, microtasks, stack, rendering],
  edges: [
    { from: tasks, to: stack, label: 'one task' },
    { from: microtasks, to: stack, label: 'all of them' },
    { from: stack, to: rendering, label: 'between tasks' },
  ],
};

function laneBox(lane: number, row: number, label: string, detail: string): DiagramBox {
  return {
    kind: 'box',
    x: lane,
    y: 8 + row * ROW_STEP,
    width: LANE_WIDTH,
    height: ROW_HEIGHT,
    label,
    detail,
  };
}

const firstSent = laneBox(LEFT_LANE, 0, 'Request 1 sent', 'query “ha”, slow');
const secondSent = laneBox(RIGHT_LANE, 1, 'Request 2 sent', 'query “harbor”, fast');
const secondAnswers: DiagramBox = {
  ...laneBox(RIGHT_LANE, 2, 'Answer 2 shown', 'Harbor Lights'),
  tone: 'primary',
};
const firstAnswers: DiagramBox = {
  ...laneBox(LEFT_LANE, 3, 'Answer 1 shown', 'every “ha” title'),
  tone: 'accent',
};
const screen: DiagramBox = {
  kind: 'box',
  x: LEFT_LANE,
  y: 8 + 4 * ROW_STEP + 16,
  width: RIGHT_LANE + LANE_WIDTH - LEFT_LANE,
  height: ROW_HEIGHT,
  label: 'The field says “harbor”',
  detail: 'the list shows the results for “ha”',
  tone: 'accent',
};

const STALE_RACE: Diagram = {
  label:
    'Request 1 for “ha” is sent first and is slow. Request 2 for “harbor” is sent second and answers first, so its results are shown. Then request 1 answers and its results replace them, so the list no longer matches the field.',
  width: DIAGRAM_WIDTH,
  height: screen.y + screen.height + 8,
  nodes: [firstSent, secondSent, secondAnswers, firstAnswers, screen],
  edges: [
    { from: firstSent, to: firstAnswers, label: 'waiting' },
    { from: secondSent, to: secondAnswers },
    { from: firstAnswers, to: screen },
  ],
};

export { EVENT_LOOP, STALE_RACE };
export type { Diagram };
