<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  import { diagramLayers, diagramTone, edgeHeads, edgeLabelPlacement, edgeShape } from './diagram';
  import { SCROLL_REGION } from './scroll-region';
  import type { DiagramBox, DiagramEdge, DiagramNode, DiagramTone } from './diagram';

  type Props = Omit<SVGAttributes<SVGSVGElement>, 'children' | 'width' | 'height'> & {
    label: string;
    width: number;
    height: number;
    nodes: readonly DiagramNode[];
    edges?: readonly DiagramEdge[];
    scrollLabel?: string | undefined;
  };

  let {
    label,
    width,
    height,
    nodes,
    edges = [],
    scrollLabel,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();

  const BOX_TONES: Readonly<Record<DiagramTone, string | undefined>> = {
    neutral: undefined,
    primary: 'diagram-box-primary',
    accent: 'diagram-box-accent',
    success: 'diagram-box-success',
    warning: 'diagram-box-warning',
    danger: 'diagram-box-danger',
  };

  const GROUP_TONES: Readonly<Record<DiagramTone, string | undefined>> = {
    neutral: undefined,
    primary: 'diagram-group-primary',
    accent: 'diagram-group-accent',
    success: 'diagram-group-success',
    warning: 'diagram-group-warning',
    danger: 'diagram-group-danger',
  };

  const layers = $derived(diagramLayers(nodes));
  const drawn = $derived(
    edges.map((edge) => {
      const shape = edgeShape(edge);
      const side = shape.kind === 'path' ? shape.labelSide : shape.line.labelSide;
      const middle = shape.kind === 'path' ? shape.middle : shape.line.middle;
      const heads = edgeHeads(edge.heads);
      const marker = `url(#${uid}-arrow${edge.emphasis === 'active' ? '-active' : ''})`;
      return {
        edge,
        shape,
        placement: edgeLabelPlacement(edge, middle, side),
        markerStart: heads.start ? marker : undefined,
        markerEnd: heads.end ? marker : undefined,
        classes: [
          'diagram-edge',
          shape.kind === 'path' && 'diagram-edge-path',
          edge.emphasis === 'active' && 'diagram-edge-active',
          edge.emphasis === 'dimmed' && 'step-through-dimmed',
        ],
        labelClasses: [
          'diagram-edge-label',
          edge.labelBacked === true && 'diagram-edge-label-backed',
          edge.emphasis === 'active' && 'diagram-edge-label-active',
          edge.emphasis === 'dimmed' && 'step-through-dimmed',
        ],
      };
    }),
  );
  const anyActive = $derived(edges.some((edge) => edge.emphasis === 'active'));
</script>

{#snippet boxParts(box: DiagramBox)}
  <rect
    class={[
      'diagram-box',
      box.emphasis === 'active' && 'diagram-box-active',
      BOX_TONES[diagramTone(box)],
    ]}
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
{/snippet}

{#snippet drawing()}
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
      {#if anyActive}
        <marker
          id="{uid}-arrow-active"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path class="diagram-arrowhead diagram-arrowhead-active" d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      {/if}
    </defs>
    {#each layers as layer, layerIndex (layerIndex)}
      {#if layer.kind === 'group'}
        <rect
          class={['diagram-group', GROUP_TONES[diagramTone(layer.group)]]}
          x={layer.group.x}
          y={layer.group.y}
          width={layer.group.width}
          height={layer.group.height}
        />
        <text
          class="diagram-group-label eyebrow"
          x={layer.group.x}
          y={layer.group.y}
          dx="0.75em"
          dy="1.5em">{layer.group.label}</text
        >
      {:else if layer.kind === 'box'}
        {#if layer.box.emphasis === 'dimmed'}
          <g class="step-through-dimmed">{@render boxParts(layer.box)}</g>
        {:else}
          {@render boxParts(layer.box)}
        {/if}
      {:else}
        {#each drawn as item, index (index)}
          {#if item.shape.kind === 'path'}
            <path
              class={item.classes}
              d={item.shape.d}
              marker-start={item.markerStart}
              marker-end={item.markerEnd}
            />
          {:else}
            <line
              class={item.classes}
              x1={item.shape.line.start.x}
              y1={item.shape.line.start.y}
              x2={item.shape.line.end.x}
              y2={item.shape.line.end.y}
              marker-start={item.markerStart}
              marker-end={item.markerEnd}
            />
          {/if}
          {#if item.edge.label !== undefined}
            <text
              class={item.labelClasses}
              x={item.placement.x}
              y={item.placement.y}
              dx={item.placement.dx}
              dy={item.placement.dy}
              text-anchor={item.placement.anchor}>{item.edge.label}</text
            >
          {/if}
        {/each}
      {/if}
    {/each}
  </svg>
{/snippet}

{#if scrollLabel !== undefined}
  <div class="diagram-scroll" aria-label={scrollLabel} {...SCROLL_REGION}>
    {@render drawing()}
  </div>
{:else}
  {@render drawing()}
{/if}
