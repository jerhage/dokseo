<script lang="ts">
  import './sql-diagrams.css';
  import { pairsLayout } from '../../../domain/sql-diagrams';
  import type { JoinKind, PairItemState } from '../../../domain/sql-diagrams';

  type Props = {
    kind: JoinKind;
    label: string;
  };

  let { kind, label }: Props = $props();

  const uid = $props.id();

  const layout = $derived(pairsLayout(kind));

  const ITEM_CLASSES: Readonly<Record<PairItemState, string>> = {
    kept: 'diagram-box diagram-box-primary',
    consulted: 'diagram-box diagram-box-accent',
    dropped: 'diagram-box',
  };
</script>

<svg
  class="diagram sql-diagram"
  viewBox="0 0 {layout.width} {layout.height}"
  role="img"
  aria-labelledby="{uid}-title"
  style:--diagram-width="{layout.width}px"
>
  <title id="{uid}-title">{label}</title>
  <text class="diagram-group-label eyebrow" x="0" y="16">{layout.leftTitle}</text>
  <text class="diagram-group-label eyebrow" x={layout.width - layout.itemWidth} y="16"
    >{layout.rightTitle}</text
  >
  {#each layout.lines as line, index (index)}
    <line class="pair-line" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
  {/each}
  {#each [...layout.left, ...layout.right] as item (item.label)}
    <g class={{ 'is-dropped': item.state === 'dropped' }}>
      <rect
        class={ITEM_CLASSES[item.state]}
        x={item.x}
        y={item.y}
        width={layout.itemWidth}
        height={layout.itemHeight}
      />
      <text
        class="diagram-label"
        x={item.x + layout.itemWidth / 2}
        y={item.y + layout.itemHeight / 2}
        text-anchor="middle"
        dominant-baseline="central">{item.label}</text
      >
    </g>
  {/each}
</svg>
