<script lang="ts">
  import BreakpointProbe from '../components/BreakpointProbe.svelte';
  import Card from '../components/Card.svelte';
  import DemoSection from './DemoSection.svelte';

  let breakpoint = $state(0);
  let container = $state(0);

  const narrow = $derived(breakpoint > 0 && container < breakpoint);
</script>

<DemoSection id="breakpoint-probe" title="Breakpoint probe" classes={['breakpoint-probe']}>
  <p class="text-sm text-muted">
    A hidden element as wide as a breakpoint token, so a component can compare its own width with
    the token in pixels, whatever the root font size. Resize the window to cross it.
  </p>
  <Card>
    <div class="relative col gap-1" bind:clientWidth={container}>
      <BreakpointProbe breakpoint="--breakpoint-compact" bind:width={breakpoint} />
      <code class="text-xs">--breakpoint-compact: {breakpoint}px</code>
      <code class="text-xs">this card's body: {container}px</code>
      <span class="text-sm"
        >{narrow ? 'Narrower than the breakpoint' : 'At or past the breakpoint'}</span
      >
    </div>
  </Card>
</DemoSection>
