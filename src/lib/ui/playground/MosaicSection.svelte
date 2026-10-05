<script lang="ts">
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';
</script>

<DemoSection id="l-mosaic" title="Mosaic" classes={['layout-mosaic', 'layout-mosaic-*']}>
  <div class="layout-mosaic">
    <div class="layout-mosaic-lead layout-overlay">
      <div class="layout-overlay-media"></div>
      <div class="layout-overlay-scrim"></div>
      <div class="layout-overlay-content">
        <span class="text-xs">.layout-mosaic-lead + .layout-overlay</span>
        <h3>Composes with overlay</h3>
      </div>
    </div>
    <Tile class="layout-mosaic-top-right" label=".layout-mosaic-top-right" />
    <Tile class="layout-mosaic-mid-right" variant="feature" label=".layout-mosaic-mid-right" />
    <Tile class="layout-mosaic-btm-left" label=".layout-mosaic-btm-left" />
    <Tile class="layout-mosaic-btm-mid" label=".layout-mosaic-btm-mid" />
    <Tile variant="elevated" label="unplaced, fills the gap" />
  </div>
  <div class="layout-mosaic">
    <Tile class="layout-mosaic-wide" label=".layout-mosaic-wide" />
    <Tile class="layout-mosaic-narrow" label=".layout-mosaic-narrow" />
    <Tile class="layout-mosaic-mid" label=".layout-mosaic-mid" />
    <Tile class="layout-mosaic-mid" label=".layout-mosaic-mid" />
    <Tile class="layout-mosaic-tall" variant="feature" label=".layout-mosaic-tall" />
    <Tile class="layout-mosaic-wide" label=".layout-mosaic-wide" />
    <Tile class="layout-mosaic-wide" label=".layout-mosaic-wide" />
  </div>
</DemoSection>
