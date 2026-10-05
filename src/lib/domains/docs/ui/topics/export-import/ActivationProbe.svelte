<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import DocsDemo from '../../DocsDemo.svelte';

  type Reading = { readonly moment: string; readonly active: boolean | null };

  const MOMENTS = [
    { moment: 'After one resolved promise', wait: 0 },
    { moment: 'After 1 second', wait: 1000 },
    { moment: 'After 3 seconds', wait: 3000 },
    { moment: 'After 6 seconds', wait: 6000 },
    { moment: 'After 10 seconds', wait: 10_000 },
  ] as const;

  const supported = typeof navigator !== 'undefined' && 'userActivation' in navigator;

  let readings = $state.raw<readonly Reading[]>([]);
  let measuring = $state(false);

  function activeNow(): boolean | null {
    return supported ? navigator.userActivation.isActive : null;
  }

  function waited(ms: number): Promise<void> {
    return ms === 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function measure(): Promise<void> {
    const start = performance.now();
    readings = [{ moment: 'In the click handler', active: activeNow() }];
    measuring = true;
    try {
      for (const { moment, wait } of MOMENTS) {
        await waited(Math.max(0, start + wait - performance.now()));
        readings = [...readings, { moment, active: activeNow() }];
      }
    } finally {
      measuring = false;
    }
  }
</script>

<DocsDemo label="This browser's activation, measured">
  {#snippet caption()}
    Reads <code>navigator.userActivation.isActive</code> at each moment after the tap. Nothing is shared
    and nothing is consumed: reading the flag does not use it up.
  {/snippet}
  <div class="stack-md">
    {#if supported}
      <div class="row">
        <Button size="sm" variant="primary" loading={measuring} onclick={() => void measure()}>
          Tap to measure
        </Button>
      </div>
      {#if readings.length > 0}
        <ul class="list-reset col gap-2">
          {#each readings as reading (reading.moment)}
            <li class="row wrap items-center gap-2 text-sm">
              <Badge variant={reading.active ? 'success' : 'neutral'}>
                {reading.active ? 'active' : 'expired'}
              </Badge>
              {reading.moment}
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p class="m-0 text-sm text-muted">
        This browser has no <code>navigator.userActivation</code>, so the flag cannot be read here.
      </p>
    {/if}
  </div>
</DocsDemo>
