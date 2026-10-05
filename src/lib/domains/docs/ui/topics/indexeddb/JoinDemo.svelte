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
  import type { JoinStrategy } from '../../../domain/indexeddb-joins';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BOOK_COUNTS, CAPTURES_PER_BOOK, JoinLab } from './join-lab.svelte';
  import type { BookCount } from './join-lab.svelte';
  import { SCRATCH_NAME, scratchJoinReader, seedJoin } from './scratch-idb';

  const lab = new JoinLab({
    seed: seedJoin,
    reader: scratchJoinReader(),
    now: () => performance.now(),
  });

  const STRATEGY_LABELS: Readonly<Record<JoinStrategy, string>> = {
    'captures-per-book': "getAll() the books, then index('bookId').getAll(id) per book",
    'book-per-capture': 'getAll() the captures, then get(bookId) per capture',
    'two-scans': 'getAll() both stores, then group the captures in a Map',
  };

  const sizeOptions = BOOK_COUNTS.map((count) => ({
    value: String(count),
    label: `${count} books`,
  }));

  function isBookCount(value: number): value is BookCount {
    return BOOK_COUNTS.some((count) => count === value);
  }

  function chooseSize(value: string): void {
    const count = Number(value);
    if (isBookCount(count)) lab.books = count;
  }
</script>

<DocsDemo label="A join without SQL">
  {#snippet caption()}
    Each strategy builds the same list: every book with the pages of its captures. Every request
    runs in its own <code>readonly</code> transaction, the way Dokseo's helpers do. The rows live in
    the <code>join-books</code> and <code>join-captures</code> stores of
    <code>{SCRATCH_NAME}</code>.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl
      label="Books to join, {CAPTURES_PER_BOOK} captures each"
      options={sizeOptions}
      value={String(lab.books)}
      onvaluechange={chooseSize}
    />
    <div>
      <Button
        size="sm"
        variant="primary"
        loading={lab.busy}
        disabled={lab.busy}
        onclick={() => void lab.run()}>Run the three joins</Button
      >
    </div>
    {#if lab.failure !== null}
      <Alert variant="danger" title="The join failed">{lab.failure}</Alert>
    {/if}
    <Table size="sm" caption="The same result three ways">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Strategy</TableHeaderCell>
          <TableHeaderCell>Requests</TableHeaderCell>
          <TableHeaderCell>ms</TableHeaderCell>
          <TableHeaderCell>Books, captures</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each lab.runs as run (run.strategy)}
          <TableRow>
            <TableCell class="text-sm">{STRATEGY_LABELS[run.strategy]}</TableCell>
            <TableCell><strong>{run.requests}</strong></TableCell>
            <TableCell>{run.milliseconds.toFixed(1)}</TableCell>
            <TableCell>{run.books}, {run.captures}</TableCell>
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={4} class="text-muted">Nothing run yet.</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
