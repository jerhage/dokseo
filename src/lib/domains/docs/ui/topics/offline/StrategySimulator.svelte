<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import Select from '$lib/components/Select.svelte';
  import { simulateRequest } from '../../../domain/offline';
  import type {
    Answer,
    CachePick,
    NetworkPick,
    RequestPick,
    Simulation,
    SimulationClock,
  } from '../../../domain/offline';
  import DocsDemo from '../../DocsDemo.svelte';

  const REQUESTS: readonly { readonly value: RequestPick; readonly label: string }[] = [
    { value: 'navigation', label: 'Open a screen (a navigation)' },
    { value: 'build-file', label: 'A JavaScript chunk under /_app/immutable/' },
    { value: 'static-file', label: 'A font from static/' },
    { value: 'version-file', label: "SvelteKit's /_app/version.json" },
    { value: 'model-file', label: 'A model file from huggingface.co' },
  ];

  const NETWORKS: readonly { readonly value: NetworkPick; readonly label: string }[] = [
    { value: 'online', label: 'Online' },
    { value: 'slow', label: 'Slow, 6 s' },
    { value: 'offline', label: 'Offline' },
  ];

  const CACHES: readonly { readonly value: CachePick; readonly label: string }[] = [
    { value: 'held', label: 'In the cache' },
    { value: 'empty', label: 'Not in the cache' },
  ];

  const clock: SimulationClock = {
    now: () => performance.now(),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  type Run =
    | { readonly kind: 'idle' }
    | { readonly kind: 'running' }
    | { readonly kind: 'done'; readonly simulation: Simulation };

  let request = $state<RequestPick>('navigation');
  let network = $state<NetworkPick>('offline');
  let cache = $state<CachePick>('held');
  let run = $state.raw<Run>({ kind: 'idle' });

  function chooseRequest(value: string): void {
    const chosen = REQUESTS.find((option) => option.value === value);
    if (chosen !== undefined) request = chosen.value;
  }

  async function send(): Promise<void> {
    run = { kind: 'running' };
    const simulation = await simulateRequest({ request, network, cache }, location.origin, clock);
    run = { kind: 'done', simulation };
  }

  function answerText(answer: Answer): string {
    return match(answer)
      .with(
        { kind: 'browser', reached: true },
        () => 'The service worker did not respond, so the browser fetched it from the network.',
      )
      .with(
        { kind: 'browser', reached: false },
        () =>
          'The service worker did not respond, and the browser request failed. A file the page needs offline cannot take this route.',
      )
      .with(
        { kind: 'network', kept: true },
        () => 'Served from the network, and the file was kept in the shell cache.',
      )
      .with({ kind: 'network', kept: false }, () => 'Served from the network.')
      .with({ kind: 'cache' }, () => 'Served from the shell cache. No request left the device.')
      .with(
        { kind: 'shell' },
        () => 'Served the cached root document, and the app routes to the screen on the device.',
      )
      .with(
        { kind: 'network-error' },
        () => 'Nothing could respond: the page gets a network error.',
      )
      .exhaustive();
  }
</script>

<DocsDemo label="Strategy simulator">
  {#snippet caption()}
    The route comes from the real <code>shellRoute</code>, and the response from the real
    <code>navigationResponse</code> or <code>cacheFirstResponse</code>, given a stand-in network and
    cache. The patience is the real 3 s.
  {/snippet}
  <div class="stack-md">
    <Field label="Request">
      {#snippet children(control)}
        <Select
          {...control}
          value={request}
          onchange={(event) => chooseRequest(event.currentTarget.value)}
        >
          {#each REQUESTS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <div class="row wrap gap-4">
      <SegmentedControl label="Network" variant="track" options={NETWORKS} bind:value={network} />
      <SegmentedControl label="Cache" variant="track" options={CACHES} bind:value={cache} />
    </div>
    <div class="row wrap gap-2">
      <Button
        size="sm"
        variant="primary"
        loading={run.kind === 'running'}
        onclick={() => void send()}
      >
        Send the request
      </Button>
    </div>
    {#if run.kind === 'running'}
      <p class="m-0 text-sm text-muted">Waiting for a response…</p>
    {:else if run.kind === 'done'}
      {@const simulation = run.simulation}
      <p class="m-0 text-sm">
        <code>GET</code>, mode <code>{simulation.request.mode}</code>,
        <code>{simulation.request.url}</code>
      </p>
      <p class="row wrap items-center gap-2 m-0">
        Route <Badge variant="primary">{simulation.route.kind}</Badge>
        Took <Badge>{Math.round(simulation.waitedMs / 100) / 10} s</Badge>
      </p>
      <p class="m-0">{answerText(simulation.answer)}</p>
    {/if}
  </div>
</DocsDemo>
