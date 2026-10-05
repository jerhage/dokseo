import type { DiagramBox, DiagramEdge, DiagramNode, DiagramTone } from '$lib/ui/components/diagram';

type DiagramSpec = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const COLUMN_WIDTH = 112;
const COLUMN_GAP = 12;
const ITEM_TOP = 30;
const ITEM_STEP = 40;
const ITEM_HEIGHT = 32;
const ITEM_INSET = 6;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail?: string,
  tone?: DiagramTone,
): DiagramBox {
  return {
    kind: 'box',
    x,
    y,
    width,
    height: detail === undefined ? ITEM_HEIGHT : 44,
    label,
    ...(detail === undefined ? {} : { detail }),
    ...(tone === undefined ? {} : { tone }),
  };
}

function column(
  index: number,
  label: string,
  runtime: string,
  detail: string,
  reaches: readonly string[],
): readonly DiagramNode[] {
  const x = index * (COLUMN_WIDTH + COLUMN_GAP);
  const inner = COLUMN_WIDTH - ITEM_INSET * 2;
  const reachTop = ITEM_TOP + 44 + ITEM_INSET;
  return [
    {
      kind: 'group',
      x,
      y: 0,
      width: COLUMN_WIDTH,
      height: reachTop + 4 * ITEM_STEP,
      label,
      tone: 'primary',
    },
    box(x + ITEM_INSET, ITEM_TOP, inner, runtime, detail, 'primary'),
    ...reaches.map((reach, row) => box(x + ITEM_INSET, reachTop + row * ITEM_STEP, inner, reach)),
  ];
}

const KINDS_HEIGHT = ITEM_TOP + 44 + ITEM_INSET + 4 * ITEM_STEP;

const TEST_KINDS: DiagramSpec = {
  label:
    'Three columns. Unit tests run in Node on *.spec.ts files and reach pure logic, view models, server-rendered HTML and source text. Browser tests run in Chromium on *.svelte.spec.ts files and reach events, DOM APIs, focus and layout. Probes drive the built app with Playwright and reach WebKit, real touch input and a slow CPU.',
  width: 360,
  height: KINDS_HEIGHT,
  nodes: [
    ...column(0, 'unit', 'Node', '*.spec.ts', [
      'pure logic',
      'view models',
      'server HTML',
      'source text',
    ]),
    ...column(1, 'browser', 'Chromium', '*.svelte.spec.ts', [
      'events',
      'DOM APIs',
      'focus',
      'layout',
    ]),
    ...column(2, 'probe', 'built app', 'Playwright', [
      'WebKit',
      'real touch',
      'slow CPU',
      'offline',
    ]),
  ],
  edges: [],
};

const staticStep = box(0, 0, 210, 'verify:static', 'check, lint, format, deps', 'primary');
const testsStep = box(0, 90, 210, 'verify:tests', 'then unit and browser tests', 'primary');
const buildStep = box(0, 180, 210, 'verify', 'then the build', 'primary');
const ciStep = box(230, 135, 130, 'verify:ci', 'unit tests, build', 'accent');

const VERIFY_LADDER: DiagramSpec = {
  label:
    'verify:static runs svelte-check, oxlint, oxfmt and dependency-cruiser. verify:tests runs verify:static, then both test projects. verify runs verify:tests, then the build. verify:ci, which CI runs, runs verify:static, then the unit project only, then the build.',
  width: 360,
  height: 224,
  nodes: [staticStep, testsStep, buildStep, ciStep],
  edges: [
    { from: staticStep, to: testsStep, label: 'passes' },
    { from: testsStep, to: buildStep, label: 'passes' },
    { from: staticStep, to: ciStep },
  ],
};

export { TEST_KINDS, VERIFY_LADDER };
export type { DiagramSpec };
