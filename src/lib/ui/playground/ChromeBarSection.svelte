<script lang="ts">
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import ChromeBar from '../components/ChromeBar.svelte';
  import DemoSection from './DemoSection.svelte';

  const frames = $state([
    {
      callout: 'callout-top-start',
      says: 'A callout under the chrome, at the start',
      top: 0,
      bottom: 0,
    },
    {
      callout: 'callout-top-center',
      says: 'A callout under the chrome, centred',
      top: 0,
      bottom: 0,
    },
  ]);

  let shown = $state(true);
</script>

<DemoSection
  id="chrome-bar"
  title="Chrome bar"
  classes={[
    'chrome-bar',
    'chrome-bar-top',
    'chrome-bar-bottom',
    'callout-top-start',
    'callout-top-center',
  ]}
>
  <div class="grid-2">
    {#each frames as placement (placement.callout)}
      <Card>
        <div
          class="relative aspect-square overflow-hidden surface-sunken rounded-container"
          style:--pin-drop="{shown ? placement.top : 0}px"
          style:--pin-lift="{shown ? placement.bottom : 0}px"
        >
          <div class="col items-center justify-center h-full p-8">
            <Button onclick={() => (shown = !shown)}>{shown ? 'Hide chrome' : 'Show chrome'}</Button
            >
          </div>

          <p
            class={[
              placement.callout,
              'z-sticky px-3 py-2 surface-raised bordered rounded-container shadow-md text-sm',
            ]}
          >
            {placement.says}
          </p>

          <ChromeBar edge="top" {shown} bind:height={placement.top}>
            <Button size="sm" href="#chrome-bar">Back</Button>
            <span class="flex-1 truncate">A top bar, {placement.top}px</span>
          </ChromeBar>

          <ChromeBar edge="bottom" {shown} bind:height={placement.bottom}>
            <span class="text-sm text-muted">A bottom bar, {placement.bottom}px</span>
          </ChromeBar>
        </div>
      </Card>
    {/each}
  </div>
</DemoSection>
