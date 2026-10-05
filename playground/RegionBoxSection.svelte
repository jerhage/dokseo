<script lang="ts">
  import Card from '../components/Card.svelte';
  import Toggle from '../components/Toggle.svelte';
  import DemoSection from './DemoSection.svelte';

  type Region = {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly note: boolean;
  };

  const REGIONS: readonly Region[] = [
    { left: 8, top: 12, width: 34, height: 22, note: false },
    { left: 52, top: 48, width: 38, height: 30, note: true },
  ];

  let glowing = $state(true);
</script>

<DemoSection
  id="region-box"
  title="Region box"
  classes={['place-rect', 'region-box', 'region-box-accent', 'region-box-glow']}
>
  <p class="text-sm text-muted">
    <code>.place-rect</code> places a box at the rectangle a caller measured at run time, passed as
    <code>--rect-left</code>, <code>--rect-top</code>, <code>--rect-width</code> and
    <code>--rect-height</code>. <code>.region-box</code> draws a marked region in it: the primary border
    and tint, the accent border with no tint for a note, and a glow ring.
  </p>
  <Toggle bind:checked={glowing}>Glow</Toggle>
  <Card>
    <div class="relative overflow-hidden aspect-video surface-sunken rounded-container">
      {#each REGIONS as region, order (order)}
        <span
          class={[
            'place-rect region-box z-raised',
            { 'region-box-accent': region.note, 'region-box-glow': glowing },
          ]}
          style:--rect-left="{region.left}%"
          style:--rect-top="{region.top}%"
          style:--rect-width="{region.width}%"
          style:--rect-height="{region.height}%"
        ></span>
      {/each}
    </div>
  </Card>
</DemoSection>
