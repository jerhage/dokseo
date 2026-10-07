import type { DiagramBox, DiagramEdge, DiagramTone } from '$lib/ui/components/diagram';

const FLOW_WIDTH = 360;

const BOX_WIDTH = 280;

const BOX_HEIGHT = 48;

const ROW_STEP = 72;

const TOP = 8;

const LEFT = (FLOW_WIDTH - BOX_WIDTH) / 2;

function box(row: number, label: string, detail: string, tone: DiagramTone): DiagramBox {
  return {
    kind: 'box',
    x: LEFT,
    y: TOP + row * ROW_STEP,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    label,
    detail,
    tone,
  };
}

const core = box(0, 'kandan-ui', 'tag v0.x.y, push --follow-tags', 'neutral');
const library = box(1, 'kandan-ui-svelte', 'subtree pull core at the tag, push', 'neutral');
const dokseo = box(2, 'Dokseo', 'subtree pull src/lib/ui from main, push', 'primary');
const releasePr = box(3, 'Release pull request', 'opened by release-please, merged', 'neutral');
const deployed = box(4, 'Tag vx.y.z and deploy', 'the release workflow', 'accent');

const FLOW_NODES: readonly DiagramBox[] = [core, library, dokseo, releasePr, deployed];

const FLOW_EDGES: readonly DiagramEdge[] = [
  { from: core, to: library },
  { from: library, to: dokseo },
  { from: dokseo, to: releasePr },
  { from: releasePr, to: deployed },
];

const FLOW_HEIGHT = TOP * 2 + (FLOW_NODES.length - 1) * ROW_STEP + BOX_HEIGHT;

const FLOW_LABEL =
  'A change starts in kandan-ui, which is tagged v0.x.y and pushed with its tag. kandan-ui-svelte pulls the core at that tag into core/ and pushes. Dokseo pulls kandan-ui-svelte main into src/lib/ui and pushes. release-please opens a release pull request; merging it tags vx.y.z and the release workflow deploys.';

export { FLOW_EDGES, FLOW_HEIGHT, FLOW_LABEL, FLOW_NODES, FLOW_WIDTH };
