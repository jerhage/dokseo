<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { startBlobWorker } from './demo-workers';
  import { BUFFER_SIZES_MB, TransferDemo } from './transfer-demo.svelte';

  const demo = new TransferDemo({ now: () => performance.now(), startWorker: startBlobWorker });

  const sizeOptions = BUFFER_SIZES_MB.map((size) => ({ value: String(size), label: `${size} MB` }));

  const ms = (value: number): string => `${value.toFixed(1)} ms`;
  const bytes = (value: number): string => value.toLocaleString('en-US');
</script>

<DocsDemo label="Clone or transfer an ArrayBuffer">
  {#snippet caption()}
    Each run allocates a new buffer of the chosen size on this page and posts it to a fresh worker,
    which replies with the <code>byteLength</code> it received.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl
      label="Buffer size"
      options={sizeOptions}
      value={String(demo.megabytes)}
      onvaluechange={(size) => (demo.megabytes = Number(size))}
    />
    <div class="row wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        loading={demo.running === 'clone'}
        disabled={demo.running !== null}
        onclick={() => void demo.run('clone')}>postMessage(buffer)</Button
      >
      <Button
        size="sm"
        loading={demo.running === 'transfer'}
        disabled={demo.running !== null}
        onclick={() => void demo.run('transfer')}>postMessage(buffer, [buffer])</Button
      >
    </div>
    {#if demo.failure !== null}
      <Alert variant="danger" title="The run failed">{demo.failure}</Alert>
    {/if}
    <Table size="sm" caption="Runs, newest first">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Way</TableHeaderCell>
          <TableHeaderCell>Size</TableHeaderCell>
          <TableHeaderCell>postMessage call</TableHeaderCell>
          <TableHeaderCell>Until the reply</TableHeaderCell>
          <TableHeaderCell>byteLength after</TableHeaderCell>
          <TableHeaderCell>Worker received</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each demo.results as result, index (index)}
          <TableRow>
            <TableCell>{result.way}</TableCell>
            <TableCell>{result.megabytes} MB</TableCell>
            <TableCell>{ms(result.postMs)}</TableCell>
            <TableCell>{ms(result.replyMs)}</TableCell>
            <TableCell>{bytes(result.lengthAfter)}</TableCell>
            <TableCell>{bytes(result.received)}</TableCell>
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={6} class="text-muted">Not run yet.</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
