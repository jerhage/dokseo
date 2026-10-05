<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import Button from '../components/Button.svelte';
  import Progress from '../components/Progress.svelte';
  import DemoSection from './DemoSection.svelte';

  const RATIOS = ['aspect-portrait', 'aspect-square', 'aspect-video'];

  const ART =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Cpath fill='%237a8fa6' d='M0 0h4v3H0z'/%3E%3Cpath fill='%23c9a66b' d='M0 3 1.6 1.2 2.6 2.2 3.2 1.6 4 3z'/%3E%3C/svg%3E";

  let busy = $state(false);
</script>

<DemoSection
  id="l-overlay"
  title="Overlay"
  classes={[
    'layout-overlay',
    'layout-overlay-center',
    'layout-overlay-scrim',
    'scrim',
    'layout-overlay-bare',
    'layout-overlay-*',
    'pass-through',
    'reveal-on-hover',
    'aspect-*',
    'object-cover',
    'is-busy',
  ]}
>
  <div class="grid-2">
    <div class="layout-overlay">
      <div class="layout-overlay-media"></div>
      <div class="layout-overlay-scrim"></div>
      <div class="layout-overlay-content">
        <span class="eyebrow weight-semibold">Case study</span>
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
  <div class="relative aspect-video overflow-hidden rounded-container surface-sunken">
    <img class="object-cover" src={ART} alt="" />
    <div class="scrim row items-center justify-center">
      <span class="text-sm weight-medium">.scrim covers its positioned parent</span>
    </div>
  </div>
  <div class="grid-auto grid-auto-sm">
    {#each RATIOS as ratio (ratio)}
      <div class="stack-sm">
        <div class={['surface-sunken bordered rounded-container', ratio]}></div>
        <code class="text-xs">.{ratio}</code>
      </div>
    {/each}
    <div class="stack-sm">
      <div class="aspect-square overflow-hidden rounded-container">
        <img class="object-cover" src={ART} alt="" />
      </div>
      <code class="text-xs">.object-cover</code>
    </div>
  </div>
  <div class="grid-auto grid-auto-sm">
    <div class={['reveal-host stack-sm', { 'is-busy': busy }]} aria-busy={busy}>
      <div class="layout-overlay-bare aspect-portrait overflow-hidden bordered rounded-container">
        <img class="layout-overlay-fill object-cover" src={ART} alt="" />
        <div class="layout-overlay-top-end reveal-on-hover">
          <Button size="sm" pill onclick={() => (busy = !busy)}>{busy ? 'Done' : 'Busy'}</Button>
        </div>
        <div class="layout-overlay-top-start">
          <Badge variant="primary">top-start</Badge>
        </div>
        <div class="layout-overlay-bottom pass-through col items-start gap-2 p-2">
          <Badge variant="neutral">pass-through</Badge>
          <Progress label="Overlay progress" value={40} size="sm" />
        </div>
      </div>
      <span class="text-xs text-muted">
        Hover or tab to reveal the button; it toggles .is-busy on the whole tile.
      </span>
    </div>
  </div>
</DemoSection>
