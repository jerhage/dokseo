<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Slider from '$lib/ui/components/Slider.svelte';
  import { RaceSearch, delayedAnswer } from '../../../domain/async-race';
  import type { RaceEvent, RaceRequest, RaceStrategy } from '../../../domain/async-race';
  import DocsDemo from '../../DocsDemo.svelte';

  type LoggedEvent = { readonly at: number; readonly event: RaceEvent };

  type Shown = { readonly request: RaceRequest; readonly answer: string } | null;

  const STRATEGIES: readonly { readonly value: RaceStrategy; readonly label: string }[] = [
    { value: 'naive', label: 'Naive' },
    { value: 'request-id', label: 'Request id' },
    { value: 'abort', label: 'Abort' },
  ];

  const FIRST_QUERY = 'ha';
  const SECOND_QUERY = 'harbor';
  const TYPING_GAP_MS = 150;
  const MAX_DELAY_MS = 3000;
  const DELAY_STEP_MS = 100;

  let strategy = $state<RaceStrategy>('naive');
  let firstDelay = $state(1500);
  let secondDelay = $state(300);
  let field = $state('');
  let shown = $state.raw<Shown>(null);
  let log = $state.raw<readonly LoggedEvent[]>([]);
  let running = $state(0);

  const fresh = $derived(shown === null || shown.request.query === field);

  function eventText(event: RaceEvent): string {
    return match(event)
      .with({ kind: 'sent' }, ({ request }) => `Request ${request.id} sent for “${request.query}”`)
      .with({ kind: 'shown' }, ({ request }) => `Answer ${request.id} arrived and was shown`)
      .with(
        { kind: 'dropped' },
        ({ request, latest }) =>
          `Answer ${request.id} arrived and was dropped: the latest request is ${latest}`,
      )
      .with({ kind: 'aborted' }, ({ request }) => `Request ${request.id} was aborted`)
      .exhaustive();
  }

  async function typeBoth(): Promise<void> {
    const started = performance.now();
    shown = null;
    log = [];
    running += 1;
    const search = new RaceSearch(strategy, delayedAnswer, {
      show: (request, answer) => (shown = { request, answer }),
      record: (event) => (log = [...log, { at: performance.now() - started, event }]),
    });
    field = FIRST_QUERY;
    const first = search.send(FIRST_QUERY, firstDelay);
    await new Promise((resolve) => setTimeout(resolve, TYPING_GAP_MS));
    field = SECOND_QUERY;
    const second = search.send(SECOND_QUERY, secondDelay);
    try {
      await Promise.all([first, second]);
    } finally {
      running -= 1;
    }
  }
</script>

<DocsDemo label="Two searches, one result list">
  {#snippet caption()}
    Each request is a real <code>setTimeout</code> with the delay you set, and an
    <code>AbortController</code> signal that clears the timer. The second request starts 150 ms after
    the first, as if “rbor” had just been typed.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl label="Strategy" variant="track" options={STRATEGIES} bind:value={strategy} />
    <p class="m-0 text-sm">Delay of request 1, “{FIRST_QUERY}”: {firstDelay} ms</p>
    <Slider
      label="Delay of request 1, “{FIRST_QUERY}”"
      value={firstDelay}
      max={MAX_DELAY_MS}
      step={DELAY_STEP_MS}
      valuetext="{firstDelay} milliseconds"
      oninput={(event) => (firstDelay = Number(event.currentTarget.value))}
    />
    <p class="m-0 text-sm">Delay of request 2, “{SECOND_QUERY}”: {secondDelay} ms</p>
    <Slider
      label="Delay of request 2, “{SECOND_QUERY}”"
      value={secondDelay}
      max={MAX_DELAY_MS}
      step={DELAY_STEP_MS}
      valuetext="{secondDelay} milliseconds"
      oninput={(event) => (secondDelay = Number(event.currentTarget.value))}
    />
    <div class="row wrap gap-2">
      <Button size="sm" variant="primary" disabled={running > 0} onclick={() => void typeBoth()}>
        Type “{FIRST_QUERY}”, then “{SECOND_QUERY}”
      </Button>
    </div>
    <div class="stack-sm" aria-live="polite">
      <p class="m-0">Search field: <code>{field === '' ? '(empty)' : field}</code></p>
      <p class="m-0 row wrap items-center gap-2">
        Results:
        {#if shown === null}
          <span class="text-muted">none yet</span>
        {:else}
          <span>{shown.answer}</span>
          <Badge variant={fresh ? 'success' : 'danger'}>
            {fresh ? 'matches the field' : `stale: for “${shown.request.query}”`}
          </Badge>
        {/if}
      </p>
    </div>
    {#if log.length > 0}
      <ol class="stack-sm m-0 text-sm">
        {#each log as entry, index (index)}
          <li><span class="mono">{Math.round(entry.at)} ms</span> {eventText(entry.event)}</li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
