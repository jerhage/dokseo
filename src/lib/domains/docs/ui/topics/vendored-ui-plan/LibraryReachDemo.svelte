<script lang="ts">
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Stat from '$lib/ui/components/Stat.svelte';
  import Table from '$lib/ui/components/Table.svelte';
  import TableBody from '$lib/ui/components/TableBody.svelte';
  import TableCell from '$lib/ui/components/TableCell.svelte';
  import TableHeader from '$lib/ui/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/ui/components/TableHeaderCell.svelte';
  import TableRow from '$lib/ui/components/TableRow.svelte';
  import type { ImportKind } from '../../../domain/library-imports';
  import DocsDemo from '../../DocsDemo.svelte';
  import { LIBRARY_REACH } from './library-reach';
  import type { LibraryFiles } from './library-reach';

  const SETS: readonly { readonly value: LibraryFiles; readonly label: string }[] = [
    { value: 'source', label: 'Source' },
    { value: 'specs', label: 'Specs' },
    { value: 'styleSpecs', label: 'Style specs' },
  ];

  const KIND_LABELS: Readonly<Record<ImportKind, string>> = {
    package: 'npm package or Node module',
    sibling: 'a file in the same folder or below',
    parent: 'a path above the folder',
    alias: 'an app alias',
  };

  let set = $state<LibraryFiles>('source');

  const reach = $derived(LIBRARY_REACH[set]);
</script>

<DocsDemo label="What the library's files import">
  {#snippet caption()}
    Every <code>import</code>, <code>import()</code> and relative <code>new URL()</code> in the
    files of <code>src/lib/ui/components/</code> and in the specs of
    <code>src/lib/ui/styles/</code>, counted once per file. A spec counts them again from the source
    and fails when the numbers differ.
  {/snippet}
  <div class="stack-md">
    <SegmentedControl label="Files to read" variant="track" options={SETS} bind:value={set} />
    <dl class="layout-stats-grid m-0">
      <Stat listed size="sm" label="Files read" value={String(reach.files)} />
      <Stat listed size="sm" label="Files importing an app alias" value={String(reach.aliased)} />
      <Stat listed size="sm" label="Files reaching above the folder" value={String(reach.above)} />
    </dl>
    <Table size="sm" caption="Import targets">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Target</TableHeaderCell>
          <TableHeaderCell>Kind</TableHeaderCell>
          <TableHeaderCell>Files</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each reach.tallies as tally (tally.target)}
          <TableRow>
            <TableHeaderCell scope="row"><code>{tally.target}</code></TableHeaderCell>
            <TableCell>{KIND_LABELS[tally.kind]}</TableCell>
            <TableCell>{tally.files}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</DocsDemo>
