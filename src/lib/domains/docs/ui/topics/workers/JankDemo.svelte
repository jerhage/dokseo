<script lang="ts">
  import { onDestroy } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import { PRIMES_BELOW, countPrimes } from '../../../domain/busy-work';
  import DocsDemo from '../../DocsDemo.svelte';
  import { startBlobWorker } from './demo-workers';
  import { JankDemo } from './jank-demo.svelte';
  import type { JankPlace } from './jank-demo.svelte';
  import './jank-demo.css';

  const demo = new JankDemo({
    clock: {
      now: () => performance.now(),
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    },
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    countOnPage: countPrimes,
    startWorker: startBlobWorker,
  });

  const PLACES: readonly { place: JankPlace; title: string }[] = [
    { place: 'page', title: 'On the main thread' },
    { place: 'worker', title: 'In a worker' },
  ];

  const ms = (value: number): string => `${Math.round(value)} ms`;

  onDestroy(() => demo.dispose());
</script>

<DocsDemo label="The same loop, on the page and in a worker">
  {#snippet caption()}
    Each run counts the primes below {PRIMES_BELOW.toLocaleString('en-US')} by trial division. The dot
    moves only when a <code>requestAnimationFrame</code> callback runs on this page's main thread.
  {/snippet}
  <div class="workers-jank-demo stack-md">
    <div class="track" aria-hidden="true">
      <div class="dot" style:--jank-position={demo.position}></div>
    </div>
    <div class="row wrap gap-2">
      <Button
        size="sm"
        loading={demo.running === 'page'}
        disabled={demo.running !== null}
        onclick={() => void demo.run('page')}>Count on the main thread</Button
      >
      <Button
        size="sm"
        variant="outline"
        loading={demo.running === 'worker'}
        disabled={demo.running !== null}
        onclick={() => void demo.run('worker')}>Count in a worker</Button
      >
    </div>
    {#if demo.failure !== null}
      <Alert variant="danger" title="The run failed">{demo.failure}</Alert>
    {/if}
    <div class="grid-auto gap-4">
      {#each PLACES as { place, title } (place)}
        {@const result = demo.resultFor(place)}
        <div class="stack-sm">
          <h3 class="text-sm m-0">{title}</h3>
          {#if result === null}
            <p class="text-sm text-muted m-0">Not run yet.</p>
          {:else}
            <Stat size="sm" label="Longest gap between frames" value={ms(result.longestGapMs)} />
            <Stat size="sm" label="Time spent counting" value={ms(result.workMs)} />
            <p class="text-sm text-muted m-0">
              {result.count.toLocaleString('en-US')} primes, {result.frames} frames drawn during the run.
            </p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</DocsDemo>
