<script lang="ts">
  import Table from '$lib/components/Table.svelte';
  import TableBody from '$lib/components/TableBody.svelte';
  import TableCell from '$lib/components/TableCell.svelte';
  import TableHeader from '$lib/components/TableHeader.svelte';
  import TableHeaderCell from '$lib/components/TableHeaderCell.svelte';
  import TableRow from '$lib/components/TableRow.svelte';
  import { numericColumns, rowCountLabel } from '../../../domain/sql-result';
  import type { SqlRow } from '../../../domain/sql-examples';

  type Props = {
    columns: readonly string[];
    rows: readonly SqlRow[];
    caption?: string;
  };

  let { columns, rows, caption }: Props = $props();

  const numeric = $derived(numericColumns(rows, columns.length));
</script>

<Table size="sm" caption={caption ?? rowCountLabel(rows.length)}>
  <TableHeader>
    <TableRow>
      {#each columns as name, index (index)}
        <TableHeaderCell scope="col" numeric={numeric[index] === true}>{name}</TableHeaderCell>
      {/each}
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each rows as row, rowIndex (rowIndex)}
      <TableRow>
        {#each row as value, index (index)}
          <TableCell numeric={numeric[index] === true} class="mono">
            {#if value === null}
              <span class="text-faint">NULL</span>
            {:else}
              {value}
            {/if}
          </TableCell>
        {/each}
      </TableRow>
    {:else}
      <TableRow>
        <TableCell colspan={columns.length} class="text-muted">No rows</TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
