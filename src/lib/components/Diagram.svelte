<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  import { diagramTone, edgeLine } from './diagram';
  import type { DiagramBox, DiagramEdge, DiagramGroup, DiagramNode, DiagramTone } from './diagram';

  type Props = Omit<SVGAttributes<SVGSVGElement>, 'children' | 'width' | 'height'> & {
    label: string;
    width: number;
    height: number;
    nodes: readonly DiagramNode[];
    edges?: readonly DiagramEdge[];
  };

  let { label, width, height, nodes, edges = [], class: className, ...rest }: Props = $props();

  const uid = $props.id();

  const BOX_TONES: Readonly<Record<DiagramTone, string | undefined>> = {
    neutral: undefined,
    primary: 'diagram-box-primary',
    accent: 'diagram-box-accent',
  };

  const GROUP_TONES: Readonly<Record<DiagramTone, string | undefined>> = {
    neutral: undefined,
    primary: 'diagram-group-primary',
    accent: 'diagram-group-accent',
  };

  const groups = $derived(nodes.filter((node): node is DiagramGroup => node.kind === 'group'));
  const boxes = $derived(nodes.filter((node): node is DiagramBox => node.kind === 'box'));
  const lines = $derived(edges.map((edge) => ({ edge, line: edgeLine(edge.from, edge.to) })));
</script>

<svg
  {...rest}
  class={['diagram', className]}
  viewBox="0 0 {width} {height}"
  role="img"
  aria-labelledby="{uid}-title"
  style:--diagram-width="{width}px"
>
  <title id="{uid}-title">{label}</title>
  <defs>
    <marker
      id="{uid}-arrow"
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path class="diagram-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  </defs>
  {#each groups as group, index (index)}
    <rect
      class={['diagram-group', GROUP_TONES[diagramTone(group)]]}
      x={group.x}
      y={group.y}
      width={group.width}
      height={group.height}
    />
    <text class="diagram-group-label eyebrow" x={group.x} y={group.y} dx="0.75em" dy="1.5em"
      >{group.label}</text
    >
  {/each}
  {#each lines as { edge, line }, index (index)}
    <line
      class="diagram-edge"
      x1={line.start.x}
      y1={line.start.y}
      x2={line.end.x}
      y2={line.end.y}
      marker-end="url(#{uid}-arrow)"
    />
    {#if edge.label !== undefined}
      <text
        class="diagram-edge-label"
        x={line.middle.x}
        y={line.middle.y}
        dx={line.labelSide === 'beside' ? '0.5em' : undefined}
        dy={line.labelSide === 'above' ? '-0.5em' : '0.35em'}
        text-anchor={line.labelSide === 'beside' ? 'start' : 'middle'}>{edge.label}</text
      >
    {/if}
  {/each}
  {#each boxes as box, index (index)}
    <rect
      class={['diagram-box', BOX_TONES[diagramTone(box)]]}
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
    />
    <text
      class="diagram-label"
      x={box.x + box.width / 2}
      y={box.y + box.height / 2}
      text-anchor="middle"
      dominant-baseline="central"
    >
      {#if box.detail === undefined}
        {box.label}
      {:else}
        <tspan x={box.x + box.width / 2} dy="-0.6em">{box.label}</tspan>
        <tspan class="diagram-detail" x={box.x + box.width / 2} dy="1.4em">{box.detail}</tspan>
      {/if}
    </text>
  {/each}
</svg>
