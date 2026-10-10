<script lang="ts">
  import Diagram from '../components/Diagram.svelte';
  import type { DiagramBox, DiagramGroup, DiagramNode } from '../components/diagram';
  import Figure from '../components/Figure.svelte';
  import DemoSection from './DemoSection.svelte';

  const page: DiagramBox = { kind: 'box', x: 20, y: 20, width: 140, height: 48, label: 'Page' };
  const worker: DiagramBox = {
    kind: 'box',
    x: 200,
    y: 20,
    width: 140,
    height: 48,
    label: 'Worker',
    detail: 'off the main thread',
    tone: 'primary',
  };
  const origin: DiagramGroup = {
    kind: 'group',
    x: 20,
    y: 110,
    width: 320,
    height: 110,
    label: 'Origin storage',
  };
  const cache: DiagramBox = {
    kind: 'box',
    x: 40,
    y: 150,
    width: 120,
    height: 48,
    label: 'Cache API',
    tone: 'accent',
  };
  const files: DiagramBox = { kind: 'box', x: 200, y: 150, width: 120, height: 48, label: 'OPFS' };

  const toneNodes: readonly DiagramNode[] = (['success', 'warning', 'danger'] as const).flatMap(
    (tone, index): readonly DiagramNode[] => [
      { kind: 'group', x: 10 + index * 160, y: 10, width: 140, height: 90, label: tone, tone },
      { kind: 'box', x: 20 + index * 160, y: 40, width: 120, height: 48, label: tone, tone },
    ],
  );

  const client: DiagramBox = { kind: 'box', x: 20, y: 20, width: 120, height: 48, label: 'Client' };
  const server: DiagramBox = {
    kind: 'box',
    x: 220,
    y: 140,
    width: 120,
    height: 48,
    label: 'Server',
    emphasis: 'active',
  };
  const peer: DiagramBox = { kind: 'box', x: 20, y: 140, width: 120, height: 48, label: 'Peer' };
</script>

<DemoSection
  id="diagram"
  title="Diagram"
  classes={[
    'diagram',
    'diagram-box',
    'diagram-box-primary',
    'diagram-box-accent',
    'diagram-group',
    'diagram-group-primary',
    'diagram-group-accent',
    'diagram-label',
    'diagram-detail',
    'diagram-group-label',
    'diagram-edge',
    'diagram-edge-label',
    'diagram-arrowhead',
    'diagram-box-success',
    'diagram-box-warning',
    'diagram-box-danger',
    'diagram-box-active',
    'diagram-edge-path',
    'diagram-edge-active',
    'diagram-edge-label-backed',
    'diagram-scroll',
  ]}
>
  <p class="text-sm text-muted">
    Boxes, groups and arrows in an inline SVG, drawn in theme colours. Lay a diagram out at most 360
    units wide and it reads at phone width; wider screens never scale it past its own width.
  </p>
  <Figure>
    <Diagram
      label="A page posts to a worker, which reads the Cache API and writes OPFS"
      width={360}
      height={240}
      nodes={[origin, page, worker, cache, files]}
      edges={[
        { from: page, to: worker, label: 'post' },
        { from: worker, to: files, label: 'write' },
        { from: page, to: cache },
      ]}
    />
    {#snippet caption()}Positions are user units of the view box.{/snippet}
  </Figure>
  <Figure>
    <Diagram label="Success, warning and danger tones" width={490} height={110} nodes={toneNodes} />
    {#snippet caption()}Tones colour a box and a group alike.{/snippet}
  </Figure>
  <Figure>
    <Diagram
      label="A routed edge with a backed label, an edge with no head and an edge with two"
      scrollLabel="Routed and headed edges"
      width={360}
      height={220}
      nodes={[client, server, peer]}
      edges={[
        {
          from: client,
          to: server,
          label: 'routed',
          labelBacked: true,
          emphasis: 'active',
          labelAt: { x: 180, y: 104 },
          points: [
            { x: 140, y: 44 },
            { x: 180, y: 44 },
            { x: 180, y: 164 },
            { x: 220, y: 164 },
          ],
        },
        { from: peer, to: client, heads: 'both' },
        { from: peer, to: server, heads: 'none', label: 'plain' },
      ]}
    />
    {#snippet caption()}Bend points route an edge; the active edge and box take the primary colour.{/snippet}
  </Figure>
</DemoSection>
