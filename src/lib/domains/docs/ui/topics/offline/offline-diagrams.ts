import type { DiagramBox, DiagramEdge, DiagramTone } from '$lib/components/diagram';

type Diagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramBox[];
  readonly edges: readonly DiagramEdge[];
};

type TimelineStep = {
  readonly label: string;
  readonly detail: string;
  readonly tone: DiagramTone;
};

const DIAGRAM_WIDTH = 360;

const TIMELINE_BOX_HEIGHT = 52;

const TIMELINE_GAP = 24;

const page: DiagramBox = { kind: 'box', x: 80, y: 8, width: 200, height: 44, label: 'Page' };
const serviceWorker: DiagramBox = {
  kind: 'box',
  x: 80,
  y: 100,
  width: 200,
  height: 52,
  label: 'Service worker',
  detail: 'fetch event',
  tone: 'primary',
};
const cacheStore: DiagramBox = {
  kind: 'box',
  x: 4,
  y: 208,
  width: 168,
  height: 52,
  label: 'Cache API',
  detail: 'on this device',
  tone: 'accent',
};
const network: DiagramBox = {
  kind: 'box',
  x: 188,
  y: 208,
  width: 168,
  height: 52,
  label: 'Network',
  detail: 'the server',
};

const INTERCEPTION: Diagram = {
  label:
    'A request from the page reaches the service worker as a fetch event, and the service worker serves it from the Cache API or from the network',
  width: DIAGRAM_WIDTH,
  height: 268,
  nodes: [page, serviceWorker, cacheStore, network],
  edges: [
    { from: page, to: serviceWorker, label: 'every request' },
    { from: serviceWorker, to: cacheStore },
    { from: serviceWorker, to: network },
  ],
};

function stateBox(y: number, label: string): DiagramBox {
  return { kind: 'box', x: 8, y, width: 180, height: 44, label };
}

function restingBox(y: number, label: string, detail: string, tone: DiagramTone): DiagramBox {
  return { kind: 'box', x: 8, y, width: 180, height: 52, label, detail, tone };
}

const parsed = stateBox(8, 'parsed');
const installing = stateBox(80, 'installing');
const installed = restingBox(156, 'installed', 'waiting', 'accent');
const activating = stateBox(236, 'activating');
const activated = restingBox(308, 'activated', 'controls pages', 'primary');
const redundant: DiagramBox = {
  kind: 'box',
  x: 244,
  y: 80,
  width: 112,
  height: 44,
  label: 'redundant',
};

const LIFECYCLE: Diagram = {
  label:
    'A service worker moves from parsed to installing to installed, where it waits, then to activating and activated, where it controls pages. A failed install makes it redundant.',
  width: DIAGRAM_WIDTH,
  height: 368,
  nodes: [parsed, installing, installed, activating, activated, redundant],
  edges: [
    { from: parsed, to: installing, label: 'install event' },
    { from: installing, to: redundant, label: 'fails' },
    { from: installing, to: installed, label: 'waitUntil settled' },
    { from: installed, to: activating, label: 'old pages gone, or skipWaiting()' },
    { from: activating, to: activated, label: 'activate event' },
  ],
};

const UPDATE_STEPS: readonly TimelineStep[] = [
  { label: 'Deploy', detail: 'a new service-worker.js', tone: 'neutral' },
  { label: 'Update check', detail: 'register, update() or a navigation', tone: 'accent' },
  { label: 'Install', detail: 'precache reader-shell-<new>', tone: 'accent' },
  { label: 'Waiting', detail: 'the old worker still controls', tone: 'accent' },
  { label: 'Toast', detail: 'A new version is available', tone: 'primary' },
  { label: 'Reload tapped', detail: "posts { kind: 'skip-waiting' }", tone: 'primary' },
  { label: 'Activate', detail: 'delete old shells, claim', tone: 'accent' },
  { label: 'controllerchange', detail: 'location.reload()', tone: 'primary' },
];

function timeline(steps: readonly TimelineStep[]): Diagram {
  const nodes = steps.map((step, index): DiagramBox => ({
    kind: 'box',
    x: 60,
    y: 8 + index * (TIMELINE_BOX_HEIGHT + TIMELINE_GAP),
    width: 240,
    height: TIMELINE_BOX_HEIGHT,
    label: step.label,
    detail: step.detail,
    tone: step.tone,
  }));
  const edges = nodes.flatMap((node, index) => {
    const next = nodes[index + 1];
    return next === undefined ? [] : [{ from: node, to: next }];
  });
  return {
    label: `An update from deploy to reload: ${steps.map((step) => step.label).join(', then ')}.`,
    width: DIAGRAM_WIDTH,
    height: 16 + steps.length * TIMELINE_BOX_HEIGHT + (steps.length - 1) * TIMELINE_GAP,
    nodes,
    edges,
  };
}

const UPDATE_TIMELINE = timeline(UPDATE_STEPS);

export { INTERCEPTION, LIFECYCLE, UPDATE_STEPS, UPDATE_TIMELINE, timeline };
export type { Diagram, TimelineStep };
