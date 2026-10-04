<script lang="ts">
  import './sql-diagrams.css';
  import { productLayout } from '../../../domain/sql-diagrams';

  type Props = {
    label: string;
  };

  let { label }: Props = $props();

  const uid = $props.id();

  const layout = productLayout();
</script>

<svg
  class="diagram sql-diagram"
  viewBox="0 0 {layout.width} {layout.height}"
  role="img"
  aria-labelledby="{uid}-title"
  style:--diagram-width="{layout.width}px"
>
  <title id="{uid}-title">{label}</title>
  {#each layout.columnLabels as column (column.label)}
    <text class="diagram-detail" x={column.x} y="14" text-anchor="middle">{column.label}</text>
  {/each}
  {#each layout.rowLabels as row (row.label)}
    <text class="diagram-label" x="0" y={row.y} dominant-baseline="central">{row.label}</text>
  {/each}
  {#each layout.cells as cell, index (index)}
    <rect
      class={['cell', { 'cell-matched': cell.matched }]}
      x={cell.x}
      y={cell.y}
      width={layout.cellWidth}
      height={layout.cellHeight}
    />
  {/each}
</svg>
