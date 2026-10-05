<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';

  const reduced = new MediaQuery('prefers-reduced-motion: reduce');

  let played = $state(0);
</script>

<DocsDemo label="This device's motion setting">
  {#snippet caption()}
    The readout follows the setting live: change it in the system settings and come back. The card
    uses Dokseo's <code>a-slide-up</code> class, which the reduced-motion block in
    <code>overrides.css</code> turns off.
  {/snippet}
  <div class="stack-md">
    <p class="row wrap items-center gap-2 m-0">
      <code>prefers-reduced-motion</code>
      <Badge variant={reduced.current ? 'primary' : 'neutral'}>
        {reduced.current ? 'reduce' : 'no-preference'}
      </Badge>
    </p>
    <div class="row wrap items-center gap-3">
      <Button size="sm" variant="outline" onclick={() => (played += 1)}>Show the card again</Button>
      {#key played}
        <span class="a-slide-up bordered rounded-container p-3 text-sm">
          {reduced.current ? 'Shown without sliding.' : 'Slid up into place.'}
        </span>
      {/key}
    </div>
  </div>
</DocsDemo>
