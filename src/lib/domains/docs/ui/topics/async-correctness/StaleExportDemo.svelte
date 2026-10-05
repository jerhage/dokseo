<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Slider from '$lib/ui/components/Slider.svelte';
  import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
  import { bookId } from '$lib/shared/ids';
  import DocsDemo from '../../DocsDemo.svelte';
  import { exportStateText, rehearsedExporting } from './stale-export';
  import type { ExportLogEntry, RehearsalBook } from './stale-export';

  type LoggedEntry = { readonly at: number; readonly entry: ExportLogEntry };

  const MAX_DELAY_MS = 3000;
  const DELAY_STEP_MS = 100;
  const HARBOR = bookId('harbor-lights');
  const FERRY = bookId('night-ferry');

  let harborDelay = $state(1500);
  let ferryDelay = $state(300);
  let log = $state.raw<readonly LoggedEntry[]>([]);
  let shownState = $state('unprepared');
  let running = $state(0);

  function books(): readonly RehearsalBook[] {
    return [
      { id: HARBOR, title: 'Harbor Lights', captures: 3, delayMs: harborDelay },
      { id: FERRY, title: 'Night Ferry', captures: 5, delayMs: ferryDelay },
    ];
  }

  function entryText(entry: ExportLogEntry): string {
    return match(entry)
      .with({ kind: 'asked' }, ({ title }) => `prepare asked for ${title}`)
      .with(
        { kind: 'answered' },
        ({ title, captures }) => `${title} answered with ${captures} captures`,
      )
      .with({ kind: 'settled' }, ({ title, state }) => `prepare(${title}) settled. State: ${state}`)
      .exhaustive();
  }

  async function prepareBoth(): Promise<void> {
    const started = performance.now();
    const held = books();
    const add = (entry: ExportLogEntry) => {
      log = [...log, { at: performance.now() - started, entry }];
    };
    const view = new BookCapturesExport(
      rehearsedExporting(held, (ms) => new Promise((resolve) => setTimeout(resolve, ms)), add),
    );
    const prepared = async (book: RehearsalBook) => {
      await view.prepare(book.id);
      shownState = exportStateText(view.state, held);
      add({ kind: 'settled', title: book.title, state: shownState });
    };
    log = [];
    running += 1;
    try {
      await Promise.all(held.map(prepared));
    } finally {
      running -= 1;
    }
  }
</script>

<DocsDemo label="Two prepares, one export">
  {#snippet caption()}
    The real <code>BookCapturesExport</code> from Dokseo, given a stand-in
    <code>exportBookCaptures</code> that answers after the delay you set. Nothing reads or writes your
    captures.
  {/snippet}
  <div class="stack-md">
    <p class="m-0 text-sm">Delay for Harbor Lights, prepared first: {harborDelay} ms</p>
    <Slider
      label="Delay for Harbor Lights, prepared first"
      value={harborDelay}
      max={MAX_DELAY_MS}
      step={DELAY_STEP_MS}
      valuetext="{harborDelay} milliseconds"
      oninput={(event) => (harborDelay = Number(event.currentTarget.value))}
    />
    <p class="m-0 text-sm">Delay for Night Ferry, prepared second: {ferryDelay} ms</p>
    <Slider
      label="Delay for Night Ferry, prepared second"
      value={ferryDelay}
      max={MAX_DELAY_MS}
      step={DELAY_STEP_MS}
      valuetext="{ferryDelay} milliseconds"
      oninput={(event) => (ferryDelay = Number(event.currentTarget.value))}
    />
    <div class="row wrap gap-2">
      <Button size="sm" variant="primary" disabled={running > 0} onclick={() => void prepareBoth()}>
        Prepare Harbor Lights, then Night Ferry
      </Button>
    </div>
    <p class="m-0 row wrap items-center gap-2" aria-live="polite">
      State <Badge variant="primary">{shownState}</Badge>
    </p>
    {#if log.length > 0}
      <ol class="stack-sm m-0 text-sm">
        {#each log as logged, index (index)}
          <li><span class="mono">{Math.round(logged.at)} ms</span> {entryText(logged.entry)}</li>
        {/each}
      </ol>
    {/if}
  </div>
</DocsDemo>
