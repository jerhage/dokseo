<script lang="ts">
  import './sql-diagrams.css';
  import type { VennRegion, VennRegions } from '../../../domain/sql-diagrams';

  type Props = {
    label: string;
    leftName: string;
    rightName: string;
    regions: VennRegions;
    shaded: readonly VennRegion[];
  };

  let { label, leftName, rightName, regions, shaded }: Props = $props();

  const uid = $props.id();

  const WIDTH = 300;
  const HEIGHT = 190;
  const RADIUS = 62;
  const TOP = 24;
  const CENTER_Y = TOP + 16 + RADIUS;
  const LEFT_X = 120;
  const RIGHT_X = 184;
  const LINE = 18;

  function circlePath(cx: number): string {
    return `M ${cx - RADIUS} ${CENTER_Y} a ${RADIUS} ${RADIUS} 0 1 0 ${RADIUS * 2} 0 a ${RADIUS} ${RADIUS} 0 1 0 ${-RADIUS * 2} 0 Z`;
  }

  const FRAME = `M 0 0 H ${WIDTH} V ${HEIGHT} H 0 Z`;

  const placements: readonly { region: VennRegion; x: number }[] = [
    { region: 'leftOnly', x: LEFT_X - 28 },
    { region: 'both', x: (LEFT_X + RIGHT_X) / 2 },
    { region: 'rightOnly', x: RIGHT_X + 28 },
  ];

  function lineY(count: number, index: number): number {
    return CENTER_Y + (index - (count - 1) / 2) * LINE;
  }
</script>

<svg
  class="diagram sql-diagram"
  viewBox="0 0 {WIDTH} {HEIGHT}"
  role="img"
  aria-labelledby="{uid}-title"
  style:--diagram-width="{WIDTH}px"
>
  <title id="{uid}-title">{label}</title>
  <defs>
    <clipPath id="{uid}-in-left"><path d={circlePath(LEFT_X)} /></clipPath>
    <clipPath id="{uid}-out-left"
      ><path clip-rule="evenodd" d="{FRAME} {circlePath(LEFT_X)}" /></clipPath
    >
    <clipPath id="{uid}-out-right"
      ><path clip-rule="evenodd" d="{FRAME} {circlePath(RIGHT_X)}" /></clipPath
    >
  </defs>
  {#if shaded.includes('neither')}
    <g clip-path="url(#{uid}-out-left)">
      <path class="region" clip-path="url(#{uid}-out-right)" d={FRAME} />
    </g>
  {/if}
  {#if shaded.includes('leftOnly')}
    <path class="region" clip-path="url(#{uid}-out-right)" d={circlePath(LEFT_X)} />
  {/if}
  {#if shaded.includes('rightOnly')}
    <path class="region" clip-path="url(#{uid}-out-left)" d={circlePath(RIGHT_X)} />
  {/if}
  {#if shaded.includes('both')}
    <path class="region" clip-path="url(#{uid}-in-left)" d={circlePath(RIGHT_X)} />
  {/if}
  <rect class="universe" x="0" y="0" width={WIDTH} height={HEIGHT} />
  <path class="set-outline" d={circlePath(LEFT_X)} />
  <path class="set-outline" d={circlePath(RIGHT_X)} />
  <text class="diagram-group-label eyebrow" x="8" y="18">users</text>
  <text class="diagram-label" x={LEFT_X - RADIUS / 2} y={TOP + 8} text-anchor="middle"
    >{leftName}</text
  >
  <text class="diagram-label" x={RIGHT_X + RADIUS / 2} y={TOP + 8} text-anchor="middle"
    >{rightName}</text
  >
  {#each placements as placement (placement.region)}
    {@const names = regions[placement.region]}
    {#each names as name, index (name)}
      <text
        class="diagram-label"
        x={placement.x}
        y={lineY(names.length, index)}
        text-anchor="middle"
        dominant-baseline="central">{name}</text
      >
    {/each}
  {/each}
  {#each regions.neither as name, index (name)}
    <text
      class="diagram-label"
      x={WIDTH - 10}
      y={HEIGHT - 12 - index * LINE}
      text-anchor="end"
      dominant-baseline="central">{name}</text
    >
  {/each}
</svg>
