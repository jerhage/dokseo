<script lang="ts">
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';
</script>

<DemoSection id="l-mosaic" title="Mosaic" classes={['layout-mosaic', 'mosaic-*']}>
  <div class="layout-mosaic">
    <div class="mosaic-lead layout-overlay">
      <div class="layout-overlay-media"></div>
      <div class="layout-overlay-scrim"></div>
      <div class="layout-overlay-content">
        <span class="text-xs">.mosaic-lead + .layout-overlay</span>
        <h3>Composes with overlay</h3>
      </div>
    </div>
    <Tile class="mosaic-top-right" label=".mosaic-top-right" />
    <Tile class="mosaic-mid-right" variant="feature" label=".mosaic-mid-right" />
    <Tile class="mosaic-btm-left" label=".mosaic-btm-left" />
    <Tile class="mosaic-btm-mid" label=".mosaic-btm-mid" />
    <Tile variant="elevated" label="unplaced, fills the gap" />
  </div>
  <div class="layout-mosaic">
    <Tile class="mosaic-wide" label=".mosaic-wide" />
    <Tile class="mosaic-narrow" label=".mosaic-narrow" />
    <Tile class="mosaic-mid" label=".mosaic-mid" />
    <Tile class="mosaic-mid" label=".mosaic-mid" />
    <Tile class="mosaic-tall" variant="feature" label=".mosaic-tall" />
    <Tile class="mosaic-wide" label=".mosaic-wide" />
    <Tile class="mosaic-wide" label=".mosaic-wide" />
  </div>
</DemoSection>
