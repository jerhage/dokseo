<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import type { FieldRow } from './field-notes';

  type Props = {
    rows: readonly FieldRow[];
    caption: string;
  };

  let { rows, caption }: Props = $props();
</script>

<Table size="sm" {caption}>
  <TableHeader>
    <TableRow>
      <TableHeaderCell>Field</TableHeaderCell>
      <TableHeaderCell>Type</TableHeaderCell>
      <TableHeaderCell>Meaning</TableHeaderCell>
      <TableHeaderCell>Read rule</TableHeaderCell>
      <TableHeaderCell>In the fixture</TableHeaderCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each rows as row (row.path)}
      <TableRow>
        <TableCell><code>{row.path}</code></TableCell>
        <TableCell><code>{row.type}</code></TableCell>
        <TableCell>{row.meaning}</TableCell>
        <TableCell>{row.rule}</TableCell>
        <TableCell><code>{row.example}</code></TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
