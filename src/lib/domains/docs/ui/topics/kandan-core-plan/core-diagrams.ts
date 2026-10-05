import type { DiagramBox, DiagramTone } from '$lib/ui/components/diagram';
import type { DiagramSpec } from '../storage/storage-diagrams';

const BOX_HEIGHT = 52;

function box(
  x: number,
  y: number,
  width: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width, height: BOX_HEIGHT, label, detail, tone };
}

const core = box(
  0,
  0,
  360,
  'kandan-ui, the core',
  'CSS, fonts, icons, appearance, fixtures',
  'primary',
);
const svelteVersion = box(0, 120, 200, 'kandan-ui-svelte', 'components, core/ inside', 'accent');
const plainPage = box(220, 120, 140, 'A plain page', 'links the CSS');
const dokseo = box(0, 240, 200, 'Dokseo', 'src/lib/ui/, core/ inside');

const CORE_CHAIN: DiagramSpec = {
  label:
    'The planned chain. The core repository kandan-ui holds the CSS, fonts, icons, the appearance code and the fixtures. kandan-ui-svelte vendors it at core/ with git subtree. Dokseo vendors kandan-ui-svelte at src/lib/ui/ with git subtree, so the core arrives inside it at src/lib/ui/core/. A plain HTML page uses the core directly by linking its stylesheet.',
  width: 360,
  height: 292,
  nodes: [core, svelteVersion, plainPage, dokseo],
  edges: [
    { from: core, to: svelteVersion, label: 'subtree' },
    { from: core, to: plainPage, label: 'link' },
    { from: svelteVersion, to: dokseo, label: 'subtree' },
  ],
};

const fixture = box(0, 0, 170, 'The fixture', 'core, one variant');
const component = box(190, 0, 170, 'Badge.svelte', 'the same variant');
const serverRender = box(190, 100, 170, 'render()', 'svelte/server, in Node', 'accent');
const fixtureNormalized = box(0, 200, 170, 'Normalize', 'comments, spaces, order');
const renderNormalized = box(190, 200, 170, 'Normalize', 'comments, spaces, order');
const comparison = box(0, 300, 360, 'Compare', 'equal, or the spec fails', 'primary');

const CONTRACT_FLOW: DiagramSpec = {
  label:
    'The contract spec. On one side, the core fixture for a variant is normalized. On the other, the Svelte component for the same variant is rendered to a string with render from svelte/server in Node, then normalized the same way: comments removed, white space next to tags dropped, attributes and class names sorted. The two strings must be equal, or the spec fails.',
  width: 360,
  height: 352,
  nodes: [fixture, component, serverRender, fixtureNormalized, renderNormalized, comparison],
  edges: [
    { from: fixture, to: fixtureNormalized },
    { from: component, to: serverRender },
    { from: serverRender, to: renderNormalized },
    { from: fixtureNormalized, to: comparison },
    { from: renderNormalized, to: comparison },
  ],
};

export { CONTRACT_FLOW, CORE_CHAIN };
