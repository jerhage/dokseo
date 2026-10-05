<script lang="ts">
  import Diagram from '../components/Diagram.svelte';
  import type { DiagramBox, DiagramGroup } from '../components/diagram';
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
</DemoSection>
