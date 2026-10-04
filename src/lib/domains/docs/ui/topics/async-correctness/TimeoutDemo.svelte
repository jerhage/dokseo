<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { WaitLedger, waitForEvent } from '../../../domain/event-wait';
  import type { WaitEnd, WaitHoldings, WaitStrategy } from '../../../domain/event-wait';
  import DocsDemo from '../../DocsDemo.svelte';

  type Ending = { readonly end: WaitEnd; readonly afterMs: number };

  const STRATEGIES: readonly { readonly value: WaitStrategy; readonly label: string }[] = [
    { value: 'forever', label: 'No timeout' },
    { value: 'race', label: 'Race' },
    { value: 'race-and-clean-up', label: 'Clean up' },
  ];

  const EVENT_TYPE = 'ready';
  const TIMEOUT_MS = 2000;

  const target = new EventTarget();
  let strategy = $state<WaitStrategy>('forever');
  let holdings = $state.raw<WaitHoldings>({ listeners: 0, timers: 0 });
  let waiting = $state(0);
  let endings = $state.raw<readonly Ending[]>([]);
  const ledger = new WaitLedger((changed) => (holdings = changed));

  async function startWaiting(): Promise<void> {
    const started = performance.now();
    waiting += 1;
    try {
      const end = await waitForEvent(ledger, target, EVENT_TYPE, TIMEOUT_MS, strategy);
      endings = [...endings, { end, afterMs: performance.now() - started }];
    } finally {
      waiting -= 1;
    }
  }

  function fire(): void {
    target.dispatchEvent(new Event(EVENT_TYPE));
  }
</script>

<DocsDemo label="Waiting for an event that may never fire">
  {#snippet caption()}
    Each wait listens for a <code>{EVENT_TYPE}</code> event on a real <code>EventTarget</code>, and
    the races add a real 2 s <code>setTimeout</code>. Nothing fires the event unless you press the
    button. The counts are the listeners and timers still attached right now.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl label="Waiting" variant="track" options={STRATEGIES} bind:value={strategy} />
    <div class="row wrap gap-2">
      <Button size="sm" variant="primary" onclick={() => void startWaiting()}>Start a wait</Button>
      <Button size="sm" variant="outline" onclick={fire}>Fire the event</Button>
    </div>
    <p class="m-0 row wrap items-center gap-2" aria-live="polite">
      <Badge variant={waiting > 0 ? 'warning' : 'neutral'}>{waiting} still waiting</Badge>
      <Badge variant={holdings.listeners > waiting ? 'danger' : 'neutral'}>
        {holdings.listeners} listeners attached
      </Badge>
      <Badge variant={holdings.timers > waiting ? 'danger' : 'neutral'}>
        {holdings.timers} timers pending
      </Badge>
    </p>
    {#if endings.length > 0}
      <ol class="stack-sm m-0 text-sm">
        {#each endings as ending, index (index)}
          <li>
            {ending.end.kind === 'arrived' ? 'The event arrived' : 'Timed out'} after
            <span class="mono">{Math.round(ending.afterMs)} ms</span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
