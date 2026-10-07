<script lang="ts">
  import './triple-click.css';
  import {
    BOX_HEIGHT,
    CFI_Y,
    CHILD_SLOTS,
    DOM_BOXES,
    DOM_LINES,
    EDGE_DIAGRAM_HEIGHT,
    EDGE_DIAGRAM_WIDTH,
    MARK_LABEL_Y,
    RESULT_Y,
    SLOT_BOTTOM,
    SLOT_LABEL_Y,
    SLOT_TOP,
    TEXT_LEFT,
  } from './edge-diagram';
  import type { EdgeDiagram } from './edge-diagram';

  type Props = { diagram: EdgeDiagram };

  let { diagram }: Props = $props();

  const uid = $props.id();

  const marks = $derived([diagram.start, diagram.end]);
</script>

<svg
  class="diagram triple-click"
  viewBox="0 0 {EDGE_DIAGRAM_WIDTH} {EDGE_DIAGRAM_HEIGHT}"
  role="img"
  aria-labelledby="{uid}-title"
  style:--diagram-width="{EDGE_DIAGRAM_WIDTH}px"
>
  <title id="{uid}-title">{diagram.label}</title>
  {#each DOM_LINES as line, index (index)}
    <line class="diagram-edge" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
  {/each}
  {#each DOM_BOXES as box, index (index)}
    <rect class="diagram-box" x={box.x} y={box.y} width={box.width} height={BOX_HEIGHT} />
    <text
      class="diagram-label"
      x={box.x + box.width / 2}
      y={box.y + BOX_HEIGHT / 2}
      text-anchor="middle"
      dominant-baseline="central">{box.label}</text
    >
  {/each}
  {#each CHILD_SLOTS as slot, index (index)}
    <line class="edge-slot" x1={slot.x} y1={SLOT_TOP} x2={slot.x} y2={SLOT_BOTTOM} />
    <text class="diagram-detail" x={slot.x} y={SLOT_LABEL_Y} text-anchor="middle">{slot.label}</text
    >
  {/each}
  {#each marks as mark (mark.label)}
    <line class="edge-mark" x1={mark.x} y1={SLOT_TOP} x2={mark.x} y2={SLOT_BOTTOM} />
    <text
      class="edge-mark-label"
      x={mark.anchor === 'start' ? TEXT_LEFT : mark.x}
      y={MARK_LABEL_Y}
      text-anchor={mark.anchor}>{mark.label}</text
    >
  {/each}
  <text class="edge-cfi" x={TEXT_LEFT} y={CFI_Y}>{diagram.cfi}</text>
  <text class="diagram-detail" x={TEXT_LEFT} y={RESULT_Y}>{diagram.result}</text>
</svg>
