<script lang="ts">
  import { onDestroy } from 'svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { startBlobWorker } from './demo-workers';
  import { ProtocolDemo } from './protocol-demo.svelte';

  const demo = new ProtocolDemo(startBlobWorker);

  onDestroy(() => demo.terminate());
</script>

<DocsDemo label="Requests with ids, replies in any order">
  {#snippet caption()}
    The worker waits for each request's delay, then replies with the square root, or with a failure
    for a negative number. The page matches each reply to its row by id.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      <Button size="sm" onclick={() => void demo.sendBatch(false)}>Send four requests</Button>
      <Button size="sm" variant="outline" onclick={() => void demo.sendBatch(true)}
        >Send four, then one the worker throws on</Button
      >
      <Button size="sm" variant="ghost" onclick={() => demo.terminate()}>terminate()</Button>
    </div>
    {#if demo.crash !== null}
      <Alert variant="danger" title="The worker's error event fired">{demo.crash}</Alert>
    {/if}
    <Table size="sm" caption="Requests in the order they were sent">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>id</TableHeaderCell>
          <TableHeaderCell>value</TableHeaderCell>
          <TableHeaderCell>delayMs</TableHeaderCell>
          <TableHeaderCell>Reply</TableHeaderCell>
          <TableHeaderCell>Arrived</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each demo.rows as row (row.id)}
          <TableRow>
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.value}</TableCell>
            <TableCell>{row.delayMs}</TableCell>
            {#if row.state.kind === 'waiting'}
              <TableCell class="text-muted">waiting</TableCell>
              <TableCell></TableCell>
            {:else if row.state.kind === 'answered'}
              <TableCell><Badge variant="success">{row.state.root.toFixed(3)}</Badge></TableCell>
              <TableCell>{row.state.arrival}</TableCell>
            {:else if row.state.kind === 'refused'}
              <TableCell><Badge variant="danger">{row.state.message}</Badge></TableCell>
              <TableCell>{row.state.arrival}</TableCell>
            {:else}
              <TableCell class="text-muted">{row.state.cause}</TableCell>
              <TableCell>never</TableCell>
            {/if}
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={5} class="text-muted">Nothing sent yet.</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
