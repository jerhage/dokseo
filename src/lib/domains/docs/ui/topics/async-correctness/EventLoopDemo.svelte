<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { ORDER_PROGRAM, eventLoopOrder } from '../../../domain/event-loop-order';
  import type { LoopEntry, LoopQueue, LoopScheduler } from '../../../domain/event-loop-order';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';

  type BadgeTone = 'neutral' | 'accent' | 'primary' | 'info';

  const QUEUE_TONES: Readonly<Record<LoopQueue, BadgeTone>> = {
    sync: 'neutral',
    microtask: 'accent',
    task: 'primary',
    frame: 'info',
  };

  const BROWSER_LOOP: LoopScheduler = {
    task: (step) => {
      setTimeout(step, 0);
    },
    frame: (step) => {
      requestAnimationFrame(step);
    },
  };

  let entries = $state.raw<readonly LoopEntry[]>([]);
  let runs = $state(0);
  let running = $state(false);

  async function run(): Promise<void> {
    running = true;
    entries = [];
    try {
      entries = await eventLoopOrder(BROWSER_LOOP);
      runs += 1;
    } finally {
      running = false;
    }
  }
</script>

<DocsDemo label="The order this browser runs them in">
  {#snippet caption()}
    The program runs in this page with the real <code>setTimeout</code>,
    <code>requestAnimationFrame</code>, <code>queueMicrotask</code> and promises. Run it a few times:
    the first six lines always come in this order, and the order of the last two depends on the browser.
  {/snippet}
  <div class="stack-md">
    <DocsCode label="The program" code={ORDER_PROGRAM} />
    <div class="row wrap items-center gap-2">
      <Button size="sm" variant="primary" loading={running} onclick={() => void run()}>
        Run the program
      </Button>
      {#if runs > 0}<span class="text-sm text-muted">Runs so far: {runs}</span>{/if}
    </div>
    {#if entries.length > 0}
      <Table size="sm" caption="The order the lines logged in">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>#</TableHeaderCell>
            <TableHeaderCell>Queue</TableHeaderCell>
            <TableHeaderCell>Line</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each entries as entry, index (entry.label)}
            <TableRow>
              <TableCell numeric>{index + 1}</TableCell>
              <TableCell><Badge variant={QUEUE_TONES[entry.queue]}>{entry.queue}</Badge></TableCell>
              <TableCell>{entry.label}</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    {/if}
  </div>
</DocsDemo>
