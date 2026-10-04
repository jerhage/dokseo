import type { DiagramBox, DiagramEdge, DiagramTone } from '$lib/components/diagram';

type Diagram = {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramBox[];
  readonly edges: readonly DiagramEdge[];
};

type Row = { readonly label: string; readonly detail: string; readonly tone?: DiagramTone };

const WIDTH = 360;

const BOX_X = 40;

const BOX_WIDTH = 280;

const BOX_HEIGHT = 48;

const GAP = 32;

const TOP = 8;

function column(rows: readonly Row[], labels: readonly (string | undefined)[]): Diagram {
  const nodes = rows.map((row, index): DiagramBox => ({
    kind: 'box',
    x: BOX_X,
    y: TOP + index * (BOX_HEIGHT + GAP),
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    label: row.label,
    detail: row.detail,
    ...(row.tone === undefined ? {} : { tone: row.tone }),
  }));
  const edges = nodes.slice(1).flatMap((to, index): DiagramEdge[] => {
    const from = nodes[index];
    if (from === undefined) return [];
    const label = labels[index];
    return [label === undefined ? { from, to } : { from, to, label }];
  });
  return {
    width: WIDTH,
    height: TOP * 2 + rows.length * BOX_HEIGHT + (rows.length - 1) * GAP,
    nodes,
    edges,
  };
}

const LAYER_ROWS: readonly Row[] = [
  { label: 'open-props', detail: 'declared, holds no rules' },
  { label: 'reset', detail: 'browser defaults cleared' },
  { label: 'base', detail: 'primitives, themes, elements' },
  { label: 'tokens', detail: 'semantic names', tone: 'primary' },
  { label: 'components', detail: '.btn, .card, .tabs', tone: 'primary' },
  { label: 'features', detail: 'domain stylesheets', tone: 'accent' },
  { label: 'utilities', detail: '.row, .p-4, .text-danger' },
  { label: 'overrides', detail: 'print, reduced motion' },
];

const LAYER_DIAGRAM = column(
  LAYER_ROWS,
  LAYER_ROWS.slice(1).map(() => 'beaten by'),
);

const TOKEN_DIAGRAM = column(
  [
    { label: '--ds-spruce-500', detail: 'palette, the theme file' },
    { label: '--ds-primary', detail: 'role primitive, the theme file', tone: 'accent' },
    { label: '--color-primary', detail: 'semantic token, tokens/colors.css', tone: 'primary' },
    { label: '.btn-primary', detail: 'component class, components/btn.css' },
  ],
  ['assigned to', 'mapped to', 'read by'],
);

const DIRECTION_DIAGRAM = column(
  [
    { label: 'src/routes/', detail: 'screens, thin' },
    { label: 'src/lib/domains/*/ui/', detail: 'one domain each', tone: 'accent' },
    { label: 'src/lib/shared/', detail: 'UI more than one domain composes' },
    { label: 'src/lib/components/', detail: 'the base library', tone: 'primary' },
  ],
  ['imports', 'imports', 'imports'],
);

export { DIRECTION_DIAGRAM, LAYER_DIAGRAM, TOKEN_DIAGRAM };
export type { Diagram };
