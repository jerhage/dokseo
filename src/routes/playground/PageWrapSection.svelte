<script lang="ts">
  import DemoSection from './DemoSection.svelte';
  import Tile from './Tile.svelte';
</script>

<DemoSection id="l-page" title="Page wrap" classes={['page-wrap', 'full-bleed']}>
  <div class="surface bordered rounded-container p-5">
    <div class="page-wrap gap-3">
      <Tile label=".page-wrap > * is the centred column" />
      <Tile class="full-bleed" variant="feature" label=".full-bleed runs edge to edge" />
      <Tile label="min(--container-wide, 100% − 2 × --page-gutter)" />
    </div>
  </div>
</DemoSection>
