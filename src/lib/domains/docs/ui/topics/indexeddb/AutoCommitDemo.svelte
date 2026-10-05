<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { COMMIT_VARIANTS, runCommitVariant } from './auto-commit';
  import type { CommitTone } from './auto-commit';
  import { CommitTimeline } from './commit-timeline.svelte';
  import { SCRATCH_NAME } from './scratch-idb';

  const timeline = new CommitTimeline({ run: runCommitVariant, now: () => performance.now() });

  const TONE_BADGES: Readonly<Record<CommitTone, 'neutral' | 'info' | 'danger'>> = {
    step: 'neutral',
    event: 'info',
    failure: 'danger',
  };
</script>

<DocsDemo label="An await inside a transaction">
  {#snippet caption()}
    Each run opens a <code>readwrite</code> transaction on the <code>notes</code> store of
    <code>{SCRATCH_NAME}</code> and tries to write two records. The delete button in the first demo removes
    them.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl
      label="How the code waits"
      options={COMMIT_VARIANTS}
      value={timeline.variant}
      onvaluechange={(variant) => (timeline.variant = variant)}
    />
    <div>
      <Button
        size="sm"
        variant="primary"
        loading={timeline.running}
        disabled={timeline.running}
        onclick={() => void timeline.run()}>Run it</Button
      >
    </div>
    <Table size="sm" caption="What happened, in order">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>ms</TableHeaderCell>
          <TableHeaderCell>Kind</TableHeaderCell>
          <TableHeaderCell>What happened</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each timeline.entries as entry, index (index)}
          <TableRow>
            <TableCell>{entry.at.toFixed(1)}</TableCell>
            <TableCell><Badge variant={TONE_BADGES[entry.tone]}>{entry.tone}</Badge></TableCell>
            <TableCell>{entry.text}</TableCell>
          </TableRow>
        {:else}
          <TableRow>
            <TableCell colspan={3} class="text-muted">Nothing run yet.</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
