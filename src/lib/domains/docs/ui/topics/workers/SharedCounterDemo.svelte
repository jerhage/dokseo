<script lang="ts">
  import { onDestroy } from 'svelte';
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { startBlobWorker } from './demo-workers';
  import { ADDS_PER_WORKER, COUNTING_WORKERS, SharedCounter } from './shared-counter.svelte';

  const isolated = crossOriginIsolated;

  const counter = new SharedCounter({ startWorker: startBlobWorker, now: () => performance.now() });

  const count = (value: number): string => value.toLocaleString('en-US');

  onDestroy(() => counter.stopWaiter());
</script>

<DocsDemo label="One Int32Array shared with workers">
  {#snippet caption()}
    The counting buttons start {COUNTING_WORKERS} workers that each add 1 to the same cell
    {count(ADDS_PER_WORKER)} times. The buffer is posted to each worker, and all of them write to the
    same memory.
  {/snippet}
  {#if !isolated}
    <Alert variant="warning" title="This page is not cross-origin isolated">
      <code>crossOriginIsolated</code> is false here, so <code>SharedArrayBuffer</code> is not available
      and the demo cannot run. Either this response came without the two isolation headers that Dokseo's
      servers send, or this browser did not apply them.
    </Alert>
  {:else}
    <div class="stack-md">
      <div class="row wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          loading={counter.running === 'plain'}
          disabled={counter.running !== null}
          onclick={() => void counter.count('plain')}>cells[0] += 1</Button
        >
        <Button
          size="sm"
          loading={counter.running === 'atomic'}
          disabled={counter.running !== null}
          onclick={() => void counter.count('atomic')}>Atomics.add(cells, 0, 1)</Button
        >
      </div>
      {#if counter.failure !== null}
        <Alert variant="danger" title="The run failed">{counter.failure}</Alert>
      {/if}
      <Table size="sm" caption="Counting runs, newest first">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Increment</TableHeaderCell>
            <TableHeaderCell>Expected</TableHeaderCell>
            <TableHeaderCell>Final value</TableHeaderCell>
            <TableHeaderCell>Time</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each counter.runs as run, index (index)}
            <TableRow>
              <TableCell><code>{run.mode === 'atomic' ? 'Atomics.add' : '+= 1'}</code></TableCell>
              <TableCell>{count(run.expected)}</TableCell>
              <TableCell>
                <Badge variant={run.total === run.expected ? 'success' : 'danger'}
                  >{count(run.total)}</Badge
                >
              </TableCell>
              <TableCell>{Math.round(run.ms)} ms</TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={4} class="text-muted">Not run yet.</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
      <div class="row wrap items-center gap-2">
        <Button size="sm" variant="outline" onclick={() => counter.waitOnPage()}
          >Atomics.wait on this page</Button
        >
        {#if counter.pageWait !== null}
          <code>{counter.pageWait}</code>
        {/if}
      </div>
      <div class="row wrap items-center gap-2">
        <Button size="sm" variant="outline" onclick={() => counter.startWaiter()}
          >Start a worker that waits</Button
        >
        <Button
          size="sm"
          variant="outline"
          disabled={counter.waiter.kind !== 'waiting'}
          onclick={() => counter.wake()}>Atomics.notify</Button
        >
        {#if counter.waiter.kind === 'waiting'}
          <Badge variant="warning">worker blocked in Atomics.wait</Badge>
        {:else if counter.waiter.kind === 'woke'}
          <Badge variant="success">worker woke: "{counter.waiter.result}"</Badge>
        {/if}
      </div>
    </div>
  {/if}
</DocsDemo>
