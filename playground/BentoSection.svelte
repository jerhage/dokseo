<script lang="ts">
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';
</script>

<DemoSection
  id="l-bento"
  title="Bento"
  classes={[
    'layout-bento',
    'layout-bento-col-1',
    'layout-bento-col-2',
    'layout-bento-col-3',
    'layout-bento-col-full',
    'layout-bento-row-2',
  ]}
>
  <div class="layout-bento">
    <Tile
      class="layout-bento-col-2 layout-bento-row-2"
      variant="feature"
      label=".layout-bento-col-2.layout-bento-row-2"
    />
    <Tile class="layout-bento-col-2" label=".layout-bento-col-2" />
    <Tile class="layout-bento-col-1" label=".layout-bento-col-1" />
    <Tile class="layout-bento-col-1" label=".layout-bento-col-1" />
    <Tile class="layout-bento-row-2" variant="elevated" label=".layout-bento-row-2" />
    <Tile class="layout-bento-col-3" label=".layout-bento-col-3" />
    <Tile class="layout-bento-col-3" label=".layout-bento-col-3" />
    <Tile class="layout-bento-col-full" label=".layout-bento-col-full" />
  </div>
  <span class="eyebrow text-faint weight-semibold"> .layout-bento: a 2 × 2 lead first </span>
  <div class="layout-bento">
    <Tile class="layout-bento-col-2 layout-bento-row-2" variant="feature" label="first child" />
    <Tile label="2" />
    <Tile label="3" />
    <Tile class="layout-bento-col-2" label=".layout-bento-col-2" />
    <Tile class="layout-bento-row-2" label=".layout-bento-row-2" />
    <Tile class="layout-bento-row-2" label=".layout-bento-row-2" />
    <Tile
      class="layout-bento-col-full layout-bento-row-2"
      variant="elevated"
      label=".layout-bento-col-full.layout-bento-row-2"
    />
  </div>
</DemoSection>
