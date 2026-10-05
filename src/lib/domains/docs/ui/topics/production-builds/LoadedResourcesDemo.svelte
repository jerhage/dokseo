<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import { byteFigure, loadSummary } from '../../../domain/production-builds';
  import DocsDemo from '../../DocsDemo.svelte';

  const MINIMUM_BUFFER = 250;

  function readLoads() {
    const entries = performance
      .getEntriesByType('resource')
      .filter((entry) => entry instanceof PerformanceResourceTiming);
    return { recorded: entries.length, summary: loadSummary(entries, location.origin) };
  }
</script>

<DocsDemo label="What this page loaded" resettable resetLabel="Read again">
  {@const { recorded, summary } = readLoads()}
  <p class="m-0 row wrap items-center gap-2 text-sm">
    <span>Same-origin requests</span>
    <Badge variant="primary">{summary.count}</Badge>
    <span>decoded</span>
    <Badge>{byteFigure(summary.decodedBytes)}</Badge>
    <span>over the network</span>
    <Badge>{byteFigure(summary.transferredBytes)}</Badge>
    {#if recorded >= MINIMUM_BUFFER}
      <Badge variant="warning">{recorded} entries: the buffer may be full</Badge>
    {/if}
  </p>
  <p class="m-0 row wrap items-center gap-2 text-sm">
    {#each summary.kinds as kind (kind.initiatorType)}
      <Badge>{kind.initiatorType}: {kind.count}</Badge>
    {/each}
  </p>
  <Table size="sm" caption="The largest same-origin responses, decoded">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Path</TableHeaderCell>
        <TableHeaderCell>Size</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each summary.largest as resource, index (index)}
        <TableRow>
          <TableCell><code class="text-xs">{resource.path}</code></TableCell>
          <TableCell>
            <span class="row wrap items-center gap-2">
              {byteFigure(resource.decodedBytes)}
              {#if resource.cached}<Badge variant="info">cache</Badge>{/if}
            </span>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
  {#snippet caption()}
    Read from <code>performance.getEntriesByType('resource')</code> in this browser. The sizes are
    each entry's <code>decodedBodySize</code> and <code>transferSize</code>; a transfer size of 0
    with a body means the response came from a cache. A browser must keep at least 250 entries; once
    its buffer is full it records no more until the page clears it or makes it larger.
  {/snippet}
</DocsDemo>
