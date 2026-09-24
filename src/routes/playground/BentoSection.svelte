<script lang="ts">
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';
</script>

<DemoSection
  id="l-bento"
  title="Bento"
  classes={[
    'grid-bento',
    'layout-bento',
    'tile-sm',
    'tile-md',
    'tile-lg',
    'tile-tall',
    'tile-wide',
  ]}
>
  <div class="grid-bento">
    <Tile class="tile-lg" variant="feature" label=".tile-lg" />
    <Tile class="tile-md" label=".tile-md" />
    <Tile class="tile-sm" label=".tile-sm" />
    <Tile class="tile-sm" label=".tile-sm" />
    <Tile class="tile-tall" variant="elevated" label=".tile-tall" />
    <Tile class="bento-col-3" label=".bento-col-3" />
    <Tile class="bento-col-3" label=".bento-col-3" />
    <Tile class="tile-wide" label=".tile-wide" />
  </div>
  <span class="text-xs text-faint uppercase tracking-wide weight-semibold">
    .layout-bento: the first child is 2 × 2
  </span>
  <div class="layout-bento">
    <Tile variant="feature" label="first child" />
    <Tile label="2" />
    <Tile label="3" />
    <Tile class="bento-col-2" label=".bento-col-2" />
    <Tile class="bento-row-2" label=".bento-row-2" />
    <Tile class="tile-span-2-row" label=".tile-span-2-row" />
    <Tile class="tile-hero" variant="elevated" label=".tile-hero" />
  </div>
</DemoSection>
