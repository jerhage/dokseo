<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import type { ContextReport } from '../../../domain/security-headers';
  import { blobWorkerReport, fileWorkerReport, pageReport } from './probes';

  type Row = { readonly context: string; readonly report: ContextReport | null };

  let rows = $state<readonly Row[]>([]);
  let running = $state(false);

  async function run(): Promise<void> {
    running = true;
    const page = pageReport();
    const blob = await blobWorkerReport();
    const file = await fileWorkerReport();
    rows = [
      { context: 'This page', report: page },
      { context: 'Worker from a blob: URL', report: blob },
      { context: 'Worker from its own file', report: file },
    ];
    running = false;
  }
</script>

<div class="stack-md">
  <div class="row wrap gap-2">
    <Button size="sm" loading={running} onclick={() => void run()}>Run the probes</Button>
  </div>
  <Table size="sm" caption="The same check in three places">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Context</TableHeaderCell>
        <TableHeaderCell><code>crossOriginIsolated</code></TableHeaderCell>
        <TableHeaderCell><code>new Function</code></TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each rows as row (row.context)}
        <TableRow>
          <TableCell>{row.context}</TableCell>
          {#if row.report === null}
            <TableCell colspan={2} class="text-muted">No message arrived from the worker.</TableCell
            >
          {:else}
            <TableCell>
              <Badge variant={row.report.isolated ? 'success' : 'warning'}
                >{row.report.isolated}</Badge
              >
            </TableCell>
            <TableCell>
              <Badge>
                {row.report.evaluates ? 'runs' : 'blocked'}
              </Badge>
            </TableCell>
          {/if}
        </TableRow>
      {:else}
        <TableRow>
          <TableCell colspan={3} class="text-muted">Not run yet.</TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
