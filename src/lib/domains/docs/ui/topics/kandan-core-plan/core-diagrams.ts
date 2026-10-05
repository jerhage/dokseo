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
const svelteVersion = box(0, 120, 170, 'kandan-ui-svelte', 'Svelte, core/ inside', 'accent');
const vanillaVersion = box(190, 120, 170, 'kandan-ui-vanilla', 'plain JS, after 1.0', 'accent');
const dokseo = box(0, 240, 170, 'Dokseo', 'src/lib/ui/, core/ inside');
const plainApp = box(190, 240, 170, 'An app with no framework', 'its own prefix');

const CORE_CHAIN: DiagramSpec = {
  label:
    'The chain. The core repository kandan-ui holds the CSS, fonts, SVG icons, the appearance script and the fixtures, and no component behavior. kandan-ui-svelte vendors it at core/ with git subtree, and kandan-ui-vanilla, which uses plain JavaScript and is planned after 1.0, will vendor it the same way. Dokseo vendors kandan-ui-svelte at src/lib/ui/, so the core arrives inside it at src/lib/ui/core/. An app with no framework will vendor kandan-ui-vanilla the same way.',
  width: 360,
  height: 292,
  nodes: [core, svelteVersion, vanillaVersion, dokseo, plainApp],
  edges: [
    { from: core, to: svelteVersion, label: 'subtree' },
    { from: core, to: vanillaVersion, label: 'subtree' },
    { from: svelteVersion, to: dokseo, label: 'subtree' },
    { from: vanillaVersion, to: plainApp, label: 'subtree' },
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
