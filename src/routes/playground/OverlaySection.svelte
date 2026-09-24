<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="l-overlay"
  title="Overlay"
  classes={['layout-overlay', 'layout-overlay-center', 'layout-overlay-scrim']}
>
  <div class="grid-2">
    <div class="layout-overlay">
      <div class="layout-overlay-media"></div>
      <div class="layout-overlay-scrim"></div>
      <div class="layout-overlay-content">
        <span class="text-xs uppercase tracking-wide weight-semibold">Case study</span>
        <h3>Northwind rebrand in two weeks</h3>
      </div>
    </div>
    <div class="layout-overlay layout-overlay-center">
      <div class="layout-overlay-media"></div>
      <div class="layout-overlay-scrim"></div>
      <div class="layout-overlay-content">
        <h3>Centred over a flat scrim</h3>
        <div class="row">
          <Button size="sm">Watch</Button>
        </div>
      </div>
    </div>
  </div>
</DemoSection>
